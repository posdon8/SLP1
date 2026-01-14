const express = require("express");
const router = express.Router();
const { SePayPgClient } = require("sepay-pg-node");
const { authMiddleware } = require("../middleware/auth");
const Payment = require("../models/Payment");
const Revenue = require("../models/Revenue");
const Course = require("../models/Course");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const { Payout } = require("../models/Payout");

// ✅ FIX: Import từ backend utils, không phải frontend
const { calculateEarnings } = require("../utils/commission");

// ========================
// SePay Config
// ========================
const sepayClient = new SePayPgClient({
  env: process.env.SEPAY_ENV || "sandbox",
  merchant_id: process.env.SEPAY_MERCHANT_ID,
  secret_key: process.env.SEPAY_SECRET_KEY,
});


// ========================
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const { courseIds, couponCode } = req.body;
    const studentId = req.user._id;

    // Validate
    if (!courseIds?.length) return res.status(400).json({ error: "Chọn ít nhất 1 khóa học" });

    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) return res.status(404).json({ error: "Khóa học không tồn tại" });

    // Check free & already enrolled
    for (const course of courses) {
      if (course.isFree) return res.status(400).json({ error: "Khóa học miễn phí" });
      if (course.students?.some(s => s.toString() === studentId.toString())) {
        return res.status(400).json({ error: "Đã mua khóa học này" });
      }
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: "Học viên không tồn tại" });

    // Calculate total price
    const totalOriginalPrice = courses.reduce((sum, c) => sum + c.price, 0);
    const studentTier = student.studentTier?.level || "bronze";

    // Calculate coupon discount
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        let valid = true;
        if (coupon.startDate && new Date() < coupon.startDate) valid = false;
        if (coupon.expiresAt && new Date() > coupon.expiresAt) valid = false;
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) valid = false;

        if (valid && coupon.minStudentTier) {
          const tierLevels = ['bronze', 'silver', 'gold', 'platinum'];
          if (tierLevels.indexOf(studentTier) < tierLevels.indexOf(coupon.minStudentTier)) valid = false;
        }

        if (valid && coupon.applicableCourses?.length) {
          const applicable = courses.filter(c => coupon.applicableCourses.some(cid => cid.toString() === c._id.toString()));
          if (applicable.length > 0) {
            const applicablePrice = applicable.reduce((sum, c) => sum + c.price, 0);
            couponDiscount = coupon.discountType === 'percentage' 
              ? Math.round(applicablePrice * (coupon.discountValue / 100))
              : coupon.discountValue;
          }
        } else if (valid) {
          couponDiscount = coupon.discountType === 'percentage'
            ? Math.round(totalOriginalPrice * (coupon.discountValue / 100))
            : coupon.discountValue;
        }
      }
    }

    // Calculate tier discount
    const tierDiscountPercent = studentTier === 'bronze' ? 0 : studentTier === 'silver' ? 5 : studentTier === 'gold' ? 10 : 15;
    const tierDiscountAmount = Math.round(totalOriginalPrice * (tierDiscountPercent / 100));
    const totalDiscount = couponDiscount + tierDiscountAmount;
    const finalPrice = Math.max(0, totalOriginalPrice - totalDiscount);

    // Build courseBreakdown
    const courseBreakdown = [];
    let totalTeacherEarns = 0, totalPlatformFee = 0;

    for (const course of courses) {
      const teacher = await User.findById(course.teacher);
      const courseSharePercent = course.price / totalOriginalPrice;
      const courseDiscount = Math.round(totalDiscount * courseSharePercent);
      const courseFinalPrice = course.price - courseDiscount;
      const earnings = calculateEarnings(courseFinalPrice, teacher?.level || 'bronze');

      courseBreakdown.push({
        courseId: course._id,
        teacherId: course.teacher,
        courseTitle: course.title,
        coursePrice: course.price,
        discountAmount: courseDiscount,
        finalPrice: courseFinalPrice,
        teacherLevel: teacher?.level || 'bronze',
        teacherEarns: earnings.teacherEarns,
        platformFee: earnings.platformFee
      });

      totalTeacherEarns += earnings.teacherEarns;
      totalPlatformFee += earnings.platformFee;
    }

    // Create payment
    const payment = await Payment.create({
      studentId,
      courseIds,
      originalPrice: totalOriginalPrice,
      amount: finalPrice,
      couponCode: couponCode?.toUpperCase() || null,
      couponDiscount,
      tierDiscountPercent,
      tierDiscount: tierDiscountAmount,
      studentTier,
      courseBreakdown,
      totalTeacherEarns,
      totalPlatformFee,
      paymentMethod: "sepay",
      status: "pending"
    });

    const checkoutFormFields = sepayClient.checkout.initOneTimePaymentFields({
      payment_method: "BANK_TRANSFER",
      order_invoice_number: payment._id.toString(),
      order_amount: finalPrice,
      currency: "VND",
      order_description: `${courses.length} khóa học`,
      success_url: `${process.env.FRONTEND_URL}/payment-success?orderId=${payment._id}`,
      error_url: `${process.env.FRONTEND_URL}/payment-failed?orderId=${payment._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel?orderId=${payment._id}`,
    });

    res.json({
      success: true,
      checkoutUrl: sepayClient.checkout.initCheckoutUrl(),
      checkoutFields: checkoutFormFields,
      orderId: payment._id,
      courseCount: courses.length,
      finalPrice,
      discount: { originalPrice: totalOriginalPrice, totalDiscount, finalPrice }
    });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// POST /api/payment/sepay-ipn
// ========================
router.post("/sepay-ipn", async (req, res) => {
  try {
    const data = req.body;
    const paymentId = data.order?.order_invoice_number;
    if (!paymentId) return res.status(400).json({ success: false, message: "Missing order_invoice_number" });

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.status === "completed") return res.json({ success: true, message: "Already processed" });

    const transactionStatus = data.transaction?.transaction_status;
    const transactionId = data.transaction?.transaction_id;
    const amount = parseFloat(data.transaction?.transaction_amount || data.order?.order_amount);

    if (transactionStatus !== "APPROVED") {
      payment.status = "failed";
      await payment.save();
      return res.json({ success: false, message: "Payment failed" });
    }

    if (amount !== payment.amount) {
      return res.status(400).json({ success: false, message: "Amount mismatch" });
    }

    // Update payment
    payment.status = "completed";
    payment.transactionId = transactionId;
    payment.completedAt = new Date();
    await payment.save();

    // Update coupon
    if (payment.couponCode) {
      await Coupon.findOneAndUpdate({ code: payment.couponCode }, { $inc: { usedCount: 1 } });
    }

    // Enroll student
    const courseIds = payment.courseIds || [payment.courseId];
    for (const courseId of courseIds) {
      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { students: payment.studentId, paidStudents: payment.studentId },
        $inc: { totalStudents: 1 }
      });
    }

    await User.findByIdAndUpdate(payment.studentId, { $addToSet: { enrolledCourses: { $each: courseIds } } });

    // Update student tier
    const student = await User.findById(payment.studentId);
    if (student?.roles?.includes("student")) {
      student.studentTier = student.studentTier || { level: "bronze", enrolledCount: 0, totalSpent: 0, discountPercentage: 0 };
      student.studentTier.enrolledCount += courseIds.length;
      student.studentTier.totalSpent += payment.amount;

      const count = student.studentTier.enrolledCount;
      if (count >= 30) { student.studentTier.level = "platinum"; student.studentTier.discountPercentage = 15; }
      else if (count >= 15) { student.studentTier.level = "gold"; student.studentTier.discountPercentage = 10; }
      else if (count >= 5) { student.studentTier.level = "silver"; student.studentTier.discountPercentage = 5; }

      student.studentTier.upgradedAt = new Date();
      await student.save();
    }

    // Update teacher stats & revenue
    for (const breakdown of payment.courseBreakdown) {
      const teacher = await User.findById(breakdown.teacherId);
      if (teacher) {
        teacher.teacherStats = teacher.teacherStats || {};
        teacher.teacherStats.totalStudents = (teacher.teacherStats.totalStudents || 0) + 1;
        teacher.teacherStats.totalEarnings = (teacher.teacherStats.totalEarnings || 0) + breakdown.teacherEarns;
        teacher.teacherStats.updatedAt = new Date();
        await teacher.save();
      }

      let revenue = await Revenue.findOne({ teacherId: breakdown.teacherId });
      if (!revenue) revenue = new Revenue({ teacherId: breakdown.teacherId });

      revenue.pendingAmount = (revenue.pendingAmount || 0) + breakdown.teacherEarns;
      revenue.totalEarnings = (revenue.totalEarnings || 0) + breakdown.teacherEarns;
      revenue.platformRevenue = (revenue.platformRevenue || 0) + breakdown.platformFee;

      const month = new Date().toISOString().slice(0, 7);
      const monthRecord = revenue.monthlyBreakdown?.find(m => m.month === month);
      if (monthRecord) {
        monthRecord.earning += breakdown.teacherEarns;
        monthRecord.studentCount = (monthRecord.studentCount || 0) + 1;
      } else {
        revenue.monthlyBreakdown = revenue.monthlyBreakdown || [];
        revenue.monthlyBreakdown.push({ month, earning: breakdown.teacherEarns, studentCount: 1, platformFee: breakdown.platformFee, level: breakdown.teacherLevel });
      }

      await revenue.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ IPN error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// VERIFY & ADMIN ENDPOINTS
// ========================
router.get("/verify-ipn/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).select("_id status transactionId completedAt");
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        isCompleted: payment.status === "completed",
        transactionId: payment.transactionId,
        completedAt: payment.completedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/complete-payment/:paymentId", authMiddleware, async (req, res) => {
  try {
    if (!req.user.roles?.includes('admin')) return res.status(403).json({ error: "Admin only" });

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.status === "completed") return res.status(400).json({ error: "Already completed" });

    // Same logic as IPN
    payment.status = "completed";
    payment.transactionId = `MANUAL-${Date.now()}`;
    payment.completedAt = new Date();
    await payment.save();

    if (payment.couponCode) await Coupon.findOneAndUpdate({ code: payment.couponCode }, { $inc: { usedCount: 1 } });

    const courseIds = payment.courseIds || [payment.courseId];
    for (const courseId of courseIds) {
      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { students: payment.studentId, paidStudents: payment.studentId },
        $inc: { totalStudents: 1 }
      });
    }

    await User.findByIdAndUpdate(payment.studentId, { $addToSet: { enrolledCourses: { $each: courseIds } } });

    const student = await User.findById(payment.studentId);
    if (student?.roles?.includes("student")) {
      student.studentTier = student.studentTier || { level: "bronze", enrolledCount: 0, totalSpent: 0, discountPercentage: 0 };
      student.studentTier.enrolledCount += courseIds.length;
      student.studentTier.totalSpent += payment.amount;
      const count = student.studentTier.enrolledCount;
      if (count >= 30) { student.studentTier.level = "platinum"; student.studentTier.discountPercentage = 15; }
      else if (count >= 15) { student.studentTier.level = "gold"; student.studentTier.discountPercentage = 10; }
      else if (count >= 5) { student.studentTier.level = "silver"; student.studentTier.discountPercentage = 5; }
      student.studentTier.upgradedAt = new Date();
      await student.save();
    }

    for (const breakdown of payment.courseBreakdown) {
      let revenue = await Revenue.findOne({ teacherId: breakdown.teacherId });
      if (!revenue) revenue = new Revenue({ teacherId: breakdown.teacherId });
      revenue.pendingAmount = (revenue.pendingAmount || 0) + breakdown.teacherEarns;
      revenue.totalEarnings = (revenue.totalEarnings || 0) + breakdown.teacherEarns;
      await revenue.save();
    }

    res.json({ success: true, message: "Payment completed", payment: { id: payment._id, status: payment.status } });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// OTHER ENDPOINTS
// ========================
router.get("/payment-success", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5001";
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(`${frontendUrl}/payment-success${query}`);
});

router.get("/payment-failed", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5001";
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(`${frontendUrl}/payment-failed${query}`);
});

router.get("/payment-cancel", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5001";
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(`${frontendUrl}/payment-cancel${query}`);
});

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ studentId: req.user._id })
      .populate("courseIds", "title price thumbnail")
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/teacher/dashboard", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;
    const payments = await Payment.find({ "courseBreakdown.teacherId": teacherId })
      .populate("courseIds", "title")
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    const courses = await Course.find({ teacher: teacherId }).select("title price students");
    const completedPayments = payments.filter(p => p.status === "completed");

    let totalRevenue = 0, totalTeacherEarnings = 0;
    completedPayments.forEach(p => p.courseBreakdown.forEach(bd => {
      totalRevenue += bd.finalPrice || 0;
      totalTeacherEarnings += bd.teacherEarns || 0;
    }));

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalTeacherEarnings,
        totalCompletedPayments: completedPayments.length,
        totalStudents: new Set(completedPayments.map(p => p.studentId?._id?.toString())).size,
        totalCourses: courses.length
      },
      payments,
      courses
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payment/payment-success
// ========================


// ========================
// GET /api/payment/payment-failed
// ========================
router.get("/payment-failed", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5001";
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(`${frontendUrl}/payment-failed${query}`);
});

// ========================
// GET /api/payment/history
// ========================


// ========================
// GET /api/payment/teacher/dashboard
// ========================
router.get("/teacher/dashboard", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;

    const payments = await Payment.find({ teacherId })
      .populate("courseId", "title price thumbnail")
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    const courses = await Course.find({ teacher: teacherId })
      .select("title price thumbnail students");

    // ========== STATS - CALCULATE FROM PAYMENTS ==========
    // ✅ IMPORTANT: totalRevenue = sum(payment.amount), not originalPrice!
    const completedPayments = payments.filter(p => p.status === "completed");

    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalTeacherEarnings = completedPayments.reduce((sum, p) => sum + (p.teacherEarns || 0), 0);
    const totalPlatformFee = completedPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);

    // Verify: revenue = teacher earnings + platform fee
    const verified = totalRevenue === (totalTeacherEarnings + totalPlatformFee);
    if (!verified) {
      console.warn(
        `⚠️ Revenue mismatch! ${totalRevenue} != ${totalTeacherEarnings + totalPlatformFee}`
      );
    }

    const totalCompletedPayments = completedPayments.length;
    const totalPendingPayments = payments.filter(p => p.status === "pending").length;
    const totalFailedPayments = payments.filter(p => p.status === "failed").length;

    const totalStudents = new Set(
      completedPayments.map(p => p.studentId?._id?.toString())
    ).size;

    const totalCourses = courses.length;

    const stats = {
      totalRevenue,              // ✅ FINAL PRICES (after discount)
      totalTeacherEarnings,      // ✅ Teacher share
      totalPlatformFee,          // ✅ Platform share
      totalCompletedPayments,
      totalPendingPayments,
      totalFailedPayments,
      totalStudents,
      totalCourses,
      conversionRate: totalCompletedPayments + totalPendingPayments > 0
        ? (totalCompletedPayments / (totalCompletedPayments + totalPendingPayments) * 100).toFixed(1)
        : 0
    };

    console.log("✅ Dashboard stats calculated:", {
      totalRevenue,
      totalTeacherEarnings,
      totalPlatformFee,
      verified,
      completedPayments: totalCompletedPayments
    });

    res.json({
      success: true,
      stats,
      payments,
      courses
    });

  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// GET /api/payment/teacher/course/:courseId
// ========================
router.get("/teacher/course/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;

    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const payments = await Payment.find({
      courseId,
      teacherId,
      status: "completed"
    })
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSales = payments.length;

    const stats = {
      courseName: course.title,
      coursePrice: course.price,
      totalRevenue,
      totalSales,
      totalStudents: course.students?.length || 0
    };

    res.json({
      success: true,
      stats,
      payments
    });

  } catch (err) {
    console.error("❌ Course detail error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// GET /api/payment/teacher-earnings
// ========================
// ========================
// GET /api/payment/teacher-earnings
// Get teacher's earnings summary with payout info
// ========================
router.get("/teacher-earnings", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id.toString();

    // ==============================
    // 1️⃣ REVENUE = NGUỒN SỰ THẬT SỐ DƯ
    // ==============================
    const revenue = await Revenue.findOne({ teacherId });

    const pendingAmount = revenue?.pendingAmount || 0;
    const lockedAmount  = revenue?.lockedAmount || 0;
    const paidAmount    = revenue?.paidAmount || 0;

    const availableAmount = Math.max(0, pendingAmount - lockedAmount);

    const totalEarnings = pendingAmount + lockedAmount + paidAmount;

    // ==============================
    // 2️⃣ PAYMENT – CHỈ ĐỂ THỐNG KÊ
    // ==============================
    const payments = await Payment.find({
      status: "completed",
      "courseBreakdown.teacherId": teacherId
    })
      .populate("studentId", "username")
      .sort({ completedAt: -1 });

    let totalPlatformFee = 0;
    const monthlyMap = {};

    payments.forEach(payment => {
      const month = new Date(payment.completedAt)
        .toISOString()
        .slice(0, 7);

      for (const item of payment.courseBreakdown) {
        if (item.teacherId?.toString() !== teacherId) continue;

        const earning = item.teacherEarns || 0;
        const platformFee = item.platformFee || 0;

        totalPlatformFee += platformFee;

        if (!monthlyMap[month]) {
          monthlyMap[month] = {
            month,
            earning: 0,
            platformFee: 0,
            studentSet: new Set(),
            courseSet: new Set()
          };
        }

        monthlyMap[month].earning += earning;
        monthlyMap[month].platformFee += platformFee;
        if (payment.studentId?._id) {
          monthlyMap[month].studentSet.add(payment.studentId._id.toString());
        }
        if (item.courseId) {
          monthlyMap[month].courseSet.add(item.courseId.toString());
        }
      }
    });

    const monthlyBreakdown = Object.values(monthlyMap)
      .map(m => ({
        month: m.month,
        earning: m.earning,
        platformFee: m.platformFee,
        studentCount: m.studentSet.size,
        courseCount: m.courseSet.size
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // =========================================
    // 3️⃣ PAYOUT BATCH = NGUỒN SỰ THẬT LỊCH TRẢ
    // =========================================
    let lastPayoutDate = null;
    let nextPayoutDate = null;

    const lastPayoutBatch = await Payout.findOne({
      status: "completed",
      "teachers.teacherId": teacherId
    })
      .sort({ processedAt: -1 })
      .lean();

    if (lastPayoutBatch?.processedAt) {
      lastPayoutDate = lastPayoutBatch.processedAt;

      nextPayoutDate = new Date(lastPayoutBatch.processedAt);
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
    }

    // ==============================
    // 4️⃣ RESPONSE
    // ==============================
    res.json({
      success: true,
      earnings: {
        totalEarnings,

        pendingAmount,
        lockedAmount,
        availableAmount,
        paidAmount,

        totalPlatformFee,

        lastPayoutDate,
        nextPayoutDate,

        monthlyBreakdown
      }
    });
  } catch (err) {
    console.error("❌ Earnings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/teacher/export", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;

    const payments = await Payment.find({ "courseBreakdown.teacherId": teacherId })
      .populate("courseId", "title")
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    let csv = "Date,Student,Email,Course,Amount,Status,TransactionID\n";

    payments.forEach(p => {
      const date = new Date(p.createdAt).toLocaleDateString("en-US");
      const student = p.studentId?.username || "Unknown";
      const email = p.studentId?.email || "";
      const course = p.courseId?.title || "Unknown";
      const amount = p.amount || 0;
      const status = p.status || "pending";
      const txId = p.transactionId || "";

      p.courseBreakdown.forEach(bd => {
        if (bd.teacherId.toString() !== teacherId.toString()) return; // Chỉ lấy course của giáo viên hiện tại
        const course = bd.courseTitle || "Unknown";
        const amount = bd.teacherEarns || 0; // Số tiền giáo viên nhận
        const status = p.status || "pending";
        const txId = p.transactionId || "";

      csv += `"${date}","${student}","${email}","${course}",${amount},"${status}","${txId}"\n`;
    });
});
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payment-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);

  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;