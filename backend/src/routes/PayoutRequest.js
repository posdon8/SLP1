const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const { Payout, PayoutRequest } = require("../models/Payout");
const Revenue = require("../models/Revenue");
const User = require("../models/User");

// ========================
// ADMIN ONLY MIDDLEWARE
// ========================
const adminOnly = (req, res, next) => {
  if (!req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

// ========================
// TEACHER ROUTES
// ========================

// ======================================================
// GET /api/payout-request/check-limit
// Check if teacher can submit more requests this month
// ======================================================
router.get("/check-limit", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Get month boundaries
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Count non-rejected requests this month
    const requestsThisMonth = await PayoutRequest.find({
      teacherId,
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $ne: 'rejected' }
    });

    const requestCount = requestsThisMonth.length;
    const canRequest = requestCount < 2;

    // Get earnings info
    const revenue = await Revenue.findOne({ teacherId });
    const pendingAmount = revenue?.pendingAmount || 0;
    const lockedAmount = revenue?.lockedAmount || 0;
    const availableAmount = pendingAmount - lockedAmount;

    res.json({
      success: true,
      canRequest,
      requestCount,
      requestLimit: 2,
      pendingAmount,
      lockedAmount,
      availableAmount,
      message: canRequest 
        ? `You can submit ${2 - requestCount} more request(s) this month`
        : 'You have reached the maximum of 2 requests this month'
    });
  } catch (err) {
    console.error("❌ Check limit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// GET /api/payout-request/my-requests
// Get all requests submitted by the teacher
// ======================================================
router.get("/my-requests", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;

    const requests = await PayoutRequest.find({ teacherId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ 
      success: true, 
      requests 
    });
  } catch (err) {
    console.error("❌ Get my requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/payout-request/submit
// Teacher submits a payout request
// ======================================================
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { amount, bankAccount } = req.body;

    console.log("📝 Submitting payout request:", { teacherId, amount });

    // 1️⃣ Validate amount
    if (!amount || amount < 100000) {
      return res.status(400).json({ 
        error: "Minimum payout amount is 100,000 VND" 
      });
    }

    // 2️⃣ Check monthly request limit (max 2/month)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const requestsThisMonth = await PayoutRequest.find({
      teacherId,
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $ne: 'rejected' }
    });

    if (requestsThisMonth.length >= 2) {
      return res.status(400).json({ 
        error: "You have reached the maximum of 2 payout requests this month. Please try again next month."
      });
    }

    // 3️⃣ Check available balance
    const revenue = await Revenue.findOne({ teacherId });
    const pendingAmount = revenue?.pendingAmount || 0;
    const lockedAmount = revenue?.lockedAmount || 0;
    const availableAmount = pendingAmount - lockedAmount;

    console.log("💰 Revenue check:", {
      pendingAmount,
      lockedAmount,
      availableAmount
    });

    if (amount > availableAmount) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available: ${availableAmount.toLocaleString('vi-VN')}đ`
      });
    }

    // 4️⃣ Validate bank account
    if (!bankAccount || !bankAccount.bankName || !bankAccount.accountNumber) {
      return res.status(400).json({ 
        error: "Bank account information is required"
      });
    }

    // 5️⃣ Create request
    const requestNumber = `REQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(requestsThisMonth.length + 1).padStart(3, '0')}`;

    const payoutRequest = new PayoutRequest({
      teacherId,
      amount,
      bankAccount,
      requestNumber,
      status: 'submitted',
      submittedAt: now
    });

    const savedRequest = await payoutRequest.save();
    console.log("✅ Request saved:", { requestNumber, amount });

    // 6️⃣ Lock amount in Revenue
    const updatedRevenue = await Revenue.findOneAndUpdate(
      { teacherId },
      {
        $inc: { lockedAmount: amount }
      },
      { new: true, upsert: true }
    );

    console.log("✅ Revenue updated - amount locked:", {
      pendingAmount: updatedRevenue.pendingAmount,
      lockedAmount: updatedRevenue.lockedAmount
    });

    res.json({ 
      success: true, 
      message: "Payout request submitted successfully",
      request: savedRequest 
    });
  } catch (err) {
    console.error("❌ Submit payout request error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ADMIN ROUTES
// ========================

// ======================================================
// GET /api/payout-request/admin/pending
// Admin views all pending requests
// ======================================================
router.get("/admin/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    const requests = await PayoutRequest.find({ status: 'submitted' })
      .populate('teacherId', 'fullName email username')
      .sort({ submittedAt: -1 })
      .lean();

    const totalAmount = requests.reduce((sum, req) => sum + req.amount, 0);

    res.json({ 
      success: true, 
      requests,
      totalAmount,
      count: requests.length
    });
  } catch (err) {
    console.error("❌ Get pending requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// PUT /api/payout-request/:requestId/approve
// Admin approves a payout request
// ======================================================
router.put("/:requestId/approve", authMiddleware, adminOnly, async (req, res) => {
  try {
    const request = await PayoutRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'submitted') {
      return res.status(400).json({ 
        error: `Cannot approve ${request.status} request` 
      });
    }

    const now = new Date();
    request.status = 'approved';
    request.approvedAt = now;
    await request.save();

    console.log("✅ Request approved:", {
      requestId: request._id,
      teacherId: request.teacherId,
      amount: request.amount
    });

    res.json({ 
      success: true, 
      message: "Request approved",
      request 
    });
  } catch (err) {
    console.error("❌ Approve request error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// PUT /api/payout-request/:requestId/reject
// Admin rejects a payout request
// ======================================================
router.put("/:requestId/reject", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await PayoutRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'submitted') {
      return res.status(400).json({ 
        error: `Cannot reject ${request.status} request` 
      });
    }

    request.status = 'rejected';
    request.reason = reason || '';
    await request.save();

    console.log("🔓 Unlocking amount:", {
      teacherId: request.teacherId,
      amount: request.amount
    });

    // Unlock amount from Revenue
    const updatedRevenue = await Revenue.findOneAndUpdate(
      { teacherId: request.teacherId },
      {
        $inc: { lockedAmount: -request.amount }
      },
      { new: true }
    );

    console.log("✅ Amount unlocked:", {
      pendingAmount: updatedRevenue.pendingAmount,
      lockedAmount: updatedRevenue.lockedAmount
    });

    res.json({ 
      success: true, 
      message: "Request rejected",
      request 
    });
  } catch (err) {
    console.error("❌ Reject request error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// PUT /api/payout-request/:requestId/process
// Admin marks an approved request as paid
// This moves amount from lockedAmount to paidAmount
// ======================================================
router.put("/:requestId/process", authMiddleware, adminOnly, async (req, res) => {
  try {
    const request = await PayoutRequest.findById(req.params.requestId)
      .populate('teacherId', 'fullName email');

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        error: "Request must be approved before processing"
      });
    }

    console.log("💸 Processing payout request:", {
      requestId: request._id,
      teacherId: request.teacherId._id,
      amount: request.amount
    });

    // 🔒 SAFETY CHECK
    const revenue = await Revenue.findOne({ teacherId: request.teacherId._id });

    if (!revenue) {
      return res.status(400).json({ error: "Revenue not found" });
    }

    if (
      revenue.pendingAmount < request.amount ||
      revenue.lockedAmount < request.amount
    ) {
      return res.status(400).json({
        error: "Invalid revenue state (insufficient pending or locked amount)"
      });
    }

    // ✅ CORE FIX – ATOMIC UPDATE
    const updatedRevenue = await Revenue.findOneAndUpdate(
      { teacherId: request.teacherId._id },
      {
        $inc: {
          pendingAmount: -request.amount,
          lockedAmount: -request.amount,
          paidAmount: request.amount
        },
        $set: {
          lastPayoutDate: new Date()
        }
      },
      { new: true }
    );

    // Update request status
    request.status = 'paid';
    request.paidAt = new Date();
    await request.save();

    console.log("✅ Revenue updated after process:", {
      pendingAmount: updatedRevenue.pendingAmount,
      lockedAmount: updatedRevenue.lockedAmount,
      paidAmount: updatedRevenue.paidAmount
    });

    res.json({
      success: true,
      message: "Payout request processed successfully",
      request
    });

  } catch (err) {
    console.error("❌ Process payout request error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================================
// GET /api/payout-request/admin/history
// Admin views all payout requests history
// ======================================================
router.get("/admin/history", authMiddleware, adminOnly, async (req, res) => {
  try {
    const requests = await PayoutRequest.find()
      .populate('teacherId', 'fullName email username')
      .sort({ createdAt: -1 })
      .lean();

    const summary = {
      total: requests.length,
      submitted: requests.filter(r => r.status === 'submitted').length,
      approved: requests.filter(r => r.status === 'approved').length,
      paid: requests.filter(r => r.status === 'paid').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalAmount: requests.reduce((sum, r) => sum + r.amount, 0)
    };

    res.json({ 
      success: true, 
      requests,
      summary
    });
  } catch (err) {
    console.error("❌ Get history error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;