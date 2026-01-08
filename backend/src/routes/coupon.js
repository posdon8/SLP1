// src/routes/coupon.js - Complete với tất cả chức năng

const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const Course = require("../models/Course");

// ========================
// ✅ GET /api/coupon/available (Public) - ĐẶT TRƯỚC /:id
// Get all available coupons (dùng cho hiển thị)
// ========================
router.get("/available", async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
    })
      .select(
        "code description discountType discountValue minStudentTier maxUses usedCount"
      )
      .sort({ createdAt: -1 });

    console.log("📋 Available coupons fetched:", coupons.length);

    res.json({
      success: true,
      total: coupons.length,
      coupons,
    });
  } catch (err) {
    console.error("❌ Get available coupons error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ POST /api/coupon/valid
// Check if coupon is valid (thường dùng ở checkout)
// ========================
router.post("/valid", authMiddleware, async (req, res) => {
  try {
    const { code, courseId } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.json({
        success: false,
        message: "Coupon code không được để trống",
      });
    }

    // Tìm coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Coupon không tồn tại hoặc đã hết hạn",
      });
    }

    // Check expired
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.json({ success: false, message: "Coupon đã hết hạn" });
    }

    // Check chưa bắt đầu
    if (coupon.startDate && new Date() < coupon.startDate) {
      return res.json({ success: false, message: "Coupon chưa được kích hoạt" });
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.json({
        success: false,
        message: "Coupon đã hết lượt sử dụng",
      });
    }

    // Get student tier
    const user = await User.findById(userId);
    const studentTier = user.studentTier?.level || "bronze";

    // Check tier requirement
    if (coupon.minStudentTier) {
      const tierLevels = ["bronze", "silver", "gold", "platinum"];
      const requiredTierIndex = tierLevels.indexOf(coupon.minStudentTier);
      const studentTierIndex = tierLevels.indexOf(studentTier);

      if (studentTierIndex < requiredTierIndex) {
        return res.json({
          success: false,
          message: `Coupon chỉ áp dụng cho ${coupon.minStudentTier} trở lên`,
        });
      }
    }

    // Check applicable courses
    if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && courseId) {
      const isApplicable = coupon.applicableCourses.some(
        (cid) => cid.toString() === courseId
      );

      if (!isApplicable) {
        return res.json({
          success: false,
          message: "Coupon không áp dụng cho khóa học này",
        });
      }
    }

    // ✅ Coupon valid
    res.json({
      success: true,
      message: "Coupon hợp lệ",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
    });
  } catch (err) {
    console.error("❌ Validate coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ POST /api/coupon/apply
// Apply coupon & calculate discount
// ========================
router.post("/apply", authMiddleware, async (req, res) => {
  try {
    const { code, coursePrice, courseId } = req.body;
    const userId = req.user._id;

    if (!code || !coursePrice) {
      return res.json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.json({ success: false, message: "Coupon không hợp lệ" });
    }

    // Check expired
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.json({ success: false, message: "Coupon đã hết hạn" });
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.json({
        success: false,
        message: "Coupon đã hết lượt sử dụng",
      });
    }

    // Get user tier discount
    const user = await User.findById(userId);
    const tierDiscount = user.studentTier?.discountPercentage || 0;

    // ✅ Calculate discount
    let couponDiscount = 0;

    if (coupon.discountType === "percentage") {
      couponDiscount = Math.round(coursePrice * (coupon.discountValue / 100));
    } else if (coupon.discountType === "fixed") {
      couponDiscount = coupon.discountValue;
    }

    const tierDiscountAmount = Math.round(coursePrice * (tierDiscount / 100));
    const totalDiscount = couponDiscount + tierDiscountAmount;
    const finalPrice = Math.max(0, coursePrice - totalDiscount);

    res.json({
      success: true,
      message: "Áp dụng coupon thành công",
      discount: {
        originalPrice: coursePrice,
        couponDiscount,
        tierDiscount: tierDiscountAmount,
        totalDiscount,
        finalPrice,
        coupon: {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
        },
        studentTier: {
          level: user.studentTier?.level || "bronze",
          discountPercentage: tierDiscount,
        },
      },
    });
  } catch (err) {
    console.error("❌ Apply coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ POST /api/coupon (CREATE - Admin only)
// ========================
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Check admin
    const user = await User.findById(req.user._id);
    if (!req.user.roles?.includes('admin')) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Admin only" });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      maxUses,
      applicableCourses,
      minStudentTier,
      startDate,
      expiresAt,
      isActive,
    } = req.body;

    // ✅ VALIDATE
    if (!code || !discountType || !discountValue) {
      return res.json({
        success: false,
        message: "Mã, loại giảm giá và giá trị giảm giá là bắt buộc",
      });
    }

    if (discountValue <= 0) {
      return res.json({
        success: false,
        message: "Giá trị giảm giá phải > 0",
      });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.json({
        success: false,
        message: "Phần trăm giảm giá không được vượt quá 100%",
      });
    }

    // Check code đã tồn tại
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });
    if (existingCoupon) {
      return res.json({ success: false, message: "Mã coupon đã tồn tại" });
    }

    // Tạo coupon
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description: description || "",
      discountType,
      discountValue,
      maxUses: maxUses || null,
      applicableCourses:
        applicableCourses && applicableCourses.length > 0
          ? applicableCourses
          : null,
      minStudentTier: minStudentTier || null,
      startDate: startDate || new Date(),
      expiresAt: expiresAt || null,
      isActive: isActive !== false,
      createdBy: req.user._id,
    });

    console.log("✅ Coupon created:", {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      createdBy: user.username,
    });

    res.status(201).json({
      success: true,
      message: "Tạo coupon thành công",
      coupon,
    });
  } catch (err) {
    console.error("❌ Create coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ GET /api/coupon (List - Admin only)
// ========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!req.user.roles?.includes('admin')) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Admin only" });
    }

    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const coupons = await Coupon.find(filter)
      .populate("createdBy", "fullName username")
      .populate("applicableCourses", "title price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: coupons.length,
      coupons,
    });
  } catch (err) {
    console.error("❌ List coupons error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ GET /api/coupon/:id (Get single - Admin only)
// ========================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!req.user.roles?.includes('admin')) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Admin only" });
    }

    const coupon = await Coupon.findById(req.params.id)
      .populate("createdBy", "fullName username")
      .populate("applicableCourses", "title price");

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, coupon });
  } catch (err) {
    console.error("❌ Get coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ PUT /api/coupon/:id (Update - Admin only)
// ========================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!req.user.roles?.includes('admin')) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Admin only" });
    }

    const { code, discountValue, maxUses, isActive, expiresAt } = req.body;

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        code: code ? code.toUpperCase() : undefined,
        discountValue: discountValue !== undefined ? discountValue : undefined,
        maxUses: maxUses !== undefined ? maxUses : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        expiresAt: expiresAt !== undefined ? expiresAt : undefined,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    console.log("✅ Coupon updated:", coupon.code);

    res.json({
      success: true,
      message: "Cập nhật coupon thành công",
      coupon,
    });
  } catch (err) {
    console.error("❌ Update coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ✅ DELETE /api/coupon/:id (Delete - Admin only)
// ========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!req.user.roles?.includes('admin')) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Admin only" });
    }

    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    console.log("✅ Coupon deleted:", coupon.code);

    res.json({
      success: true,
      message: "Xóa coupon thành công",
    });
  } catch (err) {
    console.error("❌ Delete coupon error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;