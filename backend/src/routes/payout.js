const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const { Payout } = require("../models/Payout");
const Revenue = require("../models/Revenue");
const User = require("../models/User");

// ========================
// ADMIN ONLY
// ========================
const adminOnly = (req, res, next) => {
  if (!req.user.roles?.includes("admin")) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

/**
 * ======================================================
 * GET /api/payout/pending
 * Admin xem số tiền CÓ THỂ TRẢ (từ Revenue)
 * ======================================================
 */
router.get("/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    const revenues = await Revenue.find({
      pendingAmount: { $gt: 0 }
    }).lean();

    const teachers = [];

    for (const rev of revenues) {
      const availableAmount = Math.max(
        0,
        rev.pendingAmount - (rev.lockedAmount || 0)
      );

      if (availableAmount <= 0) continue;

      const user = await User.findById(rev.teacherId)
        .select("fullName email")
        .lean();

      teachers.push({
        teacherId: rev.teacherId,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "",
        pendingAmount: rev.pendingAmount,
        lockedAmount: rev.lockedAmount || 0,
        availableAmount
      });
    }

    const totalPending = teachers.reduce(
      (sum, t) => sum + t.availableAmount,
      0
    );

    res.json({ success: true, teachers, totalPending });
  } catch (err) {
    console.error("❌ Pending payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ======================================================
 * POST /api/payout/create-batch
 * Tạo payout batch từ Revenue
 * ======================================================
 */
router.post("/create-batch", authMiddleware, adminOnly, async (req, res) => {
  try {
    const revenues = await Revenue.find({
      pendingAmount: { $gt: 0 }
    });

    const teachers = [];

    for (const rev of revenues) {
      const locked = rev.lockedAmount || 0;
      const available = rev.pendingAmount - locked;

      if (available <= 0) continue;

      const user = await User.findById(rev.teacherId)
        .select("fullName email")
        .lean();

      teachers.push({
        teacherId: rev.teacherId,
        teacherName: user?.fullName || "Unknown",
        email: user?.email || "",
        amount: available,
        status: "pending"
      });
    }

    if (!teachers.length) {
      return res.json({
        success: true,
        message: "No available balance for payout",
        payout: null
      });
    }

    const payout = new Payout({
      payoutBatch: `PAYOUT-${Date.now()}`,
      teachers,
      totalAmount: teachers.reduce((s, t) => s + t.amount, 0),
      status: "draft",
      createdBy: req.user._id
    });

    await payout.save();

    res.json({
      success: true,
      message: "Payout batch created",
      payout
    });
  } catch (err) {
    console.error("❌ Create batch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ======================================================
 * PUT /api/payout/:payoutId/process
 * Process payout batch
 * ======================================================
 */
router.put("/:payoutId/process", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payoutId = req.params.payoutId;

    // 1️⃣ Lấy payout batch
    const payout = await Payout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.status === "completed") {
      return res.status(400).json({ error: "Payout already processed" });
    }

    // 2️⃣ Process từng teacher trong batch
    for (const teacher of payout.teachers) {
      if (teacher.status === "completed") continue;

      // 🔒 ATOMIC UPDATE – đảm bảo không trả quá tiền
      const revenue = await Revenue.findOneAndUpdate(
        {
          teacherId: teacher.teacherId,
          pendingAmount: { $gte: teacher.amount } // ✅ SAFETY CHECK
        },
        {
          $inc: {
            pendingAmount: -teacher.amount,
            paidAmount: teacher.amount
          },
          $set: {
            lastPayoutDate: new Date()
          }
        },
        { new: true }
      );

      if (!revenue) {
        return res.status(400).json({
          error: `Insufficient balance for teacher ${teacher.teacherId}`
        });
      }

      // 3️⃣ Update trạng thái teacher payout
      teacher.status = "completed";
      teacher.processedDate = new Date();
      teacher.transactionId = `TX-${Date.now()}-${teacher.teacherId}`;
    }

    // 4️⃣ Hoàn tất payout batch
    payout.status = "completed";
    payout.processedAt = new Date();
    await payout.save();

    res.json({
      success: true,
      message: "Payout processed successfully",
      payout
    });

  } catch (err) {
    console.error("❌ Process payout error:", err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * ======================================================
 * GET /api/payout/history
 * ======================================================
 */
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

/**
 * ======================================================
 * GET /api/payout/:payoutId
 * ======================================================
 */
router.get("/:payoutId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId)
      .populate("createdBy", "fullName email");

    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    res.json({ success: true, payout });
  } catch (err) {
    console.error("❌ Get payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ======================================================
 * DELETE /api/payout/:payoutId
 * ======================================================
 */
router.delete("/:payoutId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.status !== "draft") {
      return res
        .status(400)
        .json({ error: "Only draft payout can be deleted" });
    }

    await payout.deleteOne();
    res.json({ success: true, message: "Payout deleted" });
  } catch (err) {
    console.error("❌ Delete payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
