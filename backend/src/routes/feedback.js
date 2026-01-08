// src/routes/feedback.js
const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ✅ GỬI PHẢN HỒI (Student/Teacher)
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    console.log("📍 POST /feedback/submit - User:", req.user.id);
    
    const { subject, content, category, rating, email } = req.body;
    const userId = req.user._id || req.user.id;

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User không tìm thấy" 
      });
    }

    // Kiểm tra role (chỉ student/teacher mới được gửi)
    if (!['student', 'teacher'].includes(user.roles?.includes())) {
      return res.status(403).json({ 
        success: false, 
        message: "Chỉ student/teacher mới được gửi phản hồi" 
      });
    }

    // Validate dữ liệu
    if (!subject || !content) {
      return res.status(400).json({ 
        success: false, 
        message: "Chủ đề và nội dung là bắt buộc" 
      });
    }

    if (content.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Nội dung phản hồi phải tối thiểu 10 ký tự" 
      });
    }

    // Tạo feedback mới
    const feedback = new Feedback({
      userId: userId,
      userRole: user.roles?.includes(),
      userName: user.fullName || user.username,
      userEmail: email || user.email,
      subject: subject.trim(),
      content: content.trim(),
      category: category || "other",
      rating: parseInt(rating) || 3
    });

    await feedback.save();
    console.log("✅ Feedback created:", feedback._id);

    res.json({
      success: true,
      message: "Phản hồi đã được gửi thành công",
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error("❌ Feedback submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi gửi phản hồi: " + error.message 
    });
  }
});

// ✅ LẤY PHẢN HỒI CỦA USER
router.get("/my-feedbacks", authMiddleware, async (req, res) => {
  try {
    console.log("📍 GET /feedback/my-feedbacks - User:", req.user.id);
    
    const userId = req.user._id || req.user.id;

    const feedbacks = await Feedback.find({ userId })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });

  } catch (error) {
    console.error("❌ Get feedbacks error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi lấy phản hồi: " + error.message
    });
  }
});

// ✅ ADMIN: LẤY TẤT CẢ PHẢN HỒI
router.get("/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("📍 GET /feedback/all - Admin:", req.user.id);
    
    const { status, category, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } }
      ];
    }

    const feedbacks = await Feedback.find(query)
      .populate('userId', 'fullName email username')
      .sort({ createdAt: -1 });

    console.log("✅ Found", feedbacks.length, "feedbacks");

    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });

  } catch (error) {
    console.error("❌ Admin get feedbacks error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi lấy phản hồi: " + error.message
    });
  }
});

// ✅ ADMIN: TRẢ LỜI PHẢN HỒI
router.put("/:feedbackId/reply", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("📍 PUT /feedback/:id/reply - Admin:", req.user.id);
    
    const { adminReply } = req.body;
    if (!adminReply) {
      return res.status(400).json({ 
        success: false, 
        message: "Nội dung trả lời là bắt buộc" 
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      {
        adminReply: adminReply.trim(),
        repliedAt: new Date(),
        status: 'reviewing'
      },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: "Phản hồi không tìm thấy" 
      });
    }

    console.log("✅ Replied to feedback:", req.params.feedbackId);

    res.json({
      success: true,
      message: "Trả lời đã được gửi",
      data: feedback
    });

  } catch (error) {
    console.error("❌ Reply feedback error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi trả lời phản hồi: " + error.message
    });
  }
});

// ✅ ADMIN: CẬP NHẬT TRẠNG THÁI PHẢN HỒI
router.put("/:feedbackId/status", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("📍 PUT /feedback/:id/status - Admin:", req.user.id);
    
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewing', 'resolved', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Trạng thái không hợp lệ. Chọn: " + validStatuses.join(", ")
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: "Phản hồi không tìm thấy" 
      });
    }

    console.log("✅ Updated feedback status:", feedback._id, "->", status);

    res.json({
      success: true,
      message: "Trạng thái đã được cập nhật",
      data: feedback
    });

  } catch (error) {
    console.error("❌ Update status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi cập nhật trạng thái: " + error.message
    });
  }
});

// ✅ DELETE FEEDBACK (Admin)
router.delete("/:feedbackId", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("📍 DELETE /feedback/:id - Admin:", req.user.id);
    
    const feedback = await Feedback.findByIdAndDelete(req.params.feedbackId);

    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: "Phản hồi không tìm thấy" 
      });
    }

    console.log("✅ Deleted feedback:", req.params.feedbackId);

    res.json({
      success: true,
      message: "Phản hồi đã được xóa"
    });

  } catch (error) {
    console.error("❌ Delete feedback error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi xóa phản hồi: " + error.message
    });
  }
});

// ✅ HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({ success: true, message: "✅ Feedback routes healthy" });
});

console.log("✅ Feedback routes loaded!");

module.exports = router;