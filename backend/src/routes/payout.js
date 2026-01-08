const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const Payout = require("../models/Payout");
const Revenue = require("../models/Revenue");
const Payment = require("../models/Payment");
const User = require("../models/User");

// ========================
// ADMIN ONLY
// ========================
const adminOnly = (req, res, next) => {
  if (!req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

// ======================================================
// GET /api/payout/pending
// ======================================================
router.get("/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    // 1️⃣ payment đã dùng trong payout
    const usedPaymentIds = await Payout.distinct("teachers.paymentIds");

    // 2️⃣ payment hợp lệ
    const payments = await Payment.find({
      status: "completed",
      _id: { $nin: usedPaymentIds }
    }).lean();

    const teachersMap = {};
    const usersCache = {};

    for (const payment of payments) {
      for (const item of payment.courseBreakdown || []) {
        if (!item.teacherId) continue;

        const tid = item.teacherId.toString();
        const teacherObjectId = new mongoose.Types.ObjectId(tid);

        if (!usersCache[tid]) {
          const user = await User.findById(teacherObjectId).select("fullName email");
          usersCache[tid] = user || { fullName: "Unknown", email: "" };
        }

        if (!teachersMap[tid]) {
          teachersMap[tid] = {
            teacherId: teacherObjectId,
            fullName: usersCache[tid].fullName,
            email: usersCache[tid].email,
            pendingAmount: 0,
            paymentCount: 0
          };
        }

        teachersMap[tid].pendingAmount += item.teacherEarns || 0;
        teachersMap[tid].paymentCount += 1;
      }
    }

    const teachers = Object.values(teachersMap).filter(t => t.pendingAmount > 0);
    const totalPending = teachers.reduce((sum, t) => sum + t.pendingAmount, 0);

    res.json({ success: true, teachers, totalPending });
  } catch (err) {
    console.error("❌ Pending payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/payout/create-batch
// ======================================================
router.post("/create-batch", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { frequency = "monthly" } = req.body;

    const usedPaymentIds = await Payout.distinct("teachers.paymentIds");

    const payments = await Payment.find({
      status: "completed",
      _id: { $nin: usedPaymentIds }
    })
      .populate("studentId", "username")
      .sort({ completedAt: -1 });

    if (!payments.length) {
      return res.json({ success: true, message: "No pending payments", payout: null });
    }

    const teachersMap = {};
    const usersCache = {};

    for (const payment of payments) {
      for (const item of payment.courseBreakdown || []) {
        if (!item.teacherId) continue;

        const tid = item.teacherId.toString();
        const teacherObjectId = new mongoose.Types.ObjectId(tid);

        if (!usersCache[tid]) {
          const user = await User.findById(teacherObjectId).select("fullName email");
          usersCache[tid] = user || { fullName: "Unknown", email: "" };
        }

        if (!teachersMap[tid]) {
          teachersMap[tid] = {
            teacherId: teacherObjectId,
            teacherName: usersCache[tid].fullName,
            email: usersCache[tid].email,
            totalAmount: 0,
            paymentCount: 0,
            payments: []
          };
        }

        teachersMap[tid].totalAmount += item.teacherEarns || 0;
        teachersMap[tid].paymentCount += 1;

        teachersMap[tid].payments.push({
          paymentId: payment._id,
          amount: item.teacherEarns,
          courseTitle: item.courseTitle,
          studentName: payment.studentId?.username || "Student",
          completedAt: payment.completedAt
        });
      }
    }

    const teachers = Object.values(teachersMap).filter(t => t.totalAmount > 0);
    if (!teachers.length) {
      return res.json({ success: true, message: "No valid teachers", payout: null });
    }

    const now = new Date();

    const payout = new Payout({
      payoutBatch: `PAYOUT-${now.toISOString().slice(0, 10)}`,
      teachers: teachers.map(t => ({
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        email: t.email,
        amount: t.totalAmount,
        paymentCount: t.paymentCount,
        paymentIds: t.payments.map(p => p.paymentId),
        status: "pending",
        details: t.payments
      })),
      totalAmount: teachers.reduce((sum, t) => sum + t.totalAmount, 0),
      period: { startDate: now, endDate: now, frequency },
      status: "draft",
      createdBy: req.user._id
    });

    await payout.save();

    res.json({ success: true, message: "Payout batch created", payout });
  } catch (err) {
    console.error("❌ Create batch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// PUT /api/payout/:payoutId/process
// ======================================================
router.put("/:payoutId/process", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) return res.status(404).json({ error: "Payout not found" });

    if (payout.status === "completed") {
      return res.status(400).json({ error: "Payout already processed" });
    }

    for (const teacher of payout.teachers) {
      teacher.status = "completed";
      teacher.processedDate = new Date();
      teacher.transactionId = `PAYOUT-${Date.now()}`;

      await Revenue.findOneAndUpdate(
        { teacherId: teacher.teacherId },
        {
          $inc: {
            pendingAmount: -teacher.amount,
            paidAmount: teacher.amount
          },
          lastPayoutDate: new Date()
        },
        { upsert: true }
      );
    }

    payout.status = "completed";
    payout.processedAt = new Date();
    await payout.save();

    res.json({ success: true, message: "Payout processed", payout });
  } catch (err) {
    console.error("❌ Process payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// GET /api/payout/history
// ======================================================
router.get("/history", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payouts = await Payout.find()
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });

    res.json({ success: true, payouts });
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// GET /api/payout/:payoutId
// ======================================================
router.get("/:payoutId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId)
      .populate("createdBy", "fullName email");

    if (!payout) return res.status(404).json({ error: "Payout not found" });

    res.json({ success: true, payout });
  } catch (err) {
    console.error("❌ Get payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// DELETE /api/payout/:payoutId
// ======================================================
router.delete("/:payoutId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) return res.status(404).json({ error: "Payout not found" });

    if (payout.status !== "draft") {
      return res.status(400).json({ error: "Only draft payout can be deleted" });
    }

    await payout.deleteOne();
    res.json({ success: true, message: "Payout deleted" });
  } catch (err) {
    console.error("❌ Delete payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
