const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const NotificationService = require("../services/notificationService");
// Bắt đầu hoặc lấy conversation
// routes/chat.js
router.post("/start", authMiddleware, async (req, res) => {
  const { userId, courseId } = req.body;
  const me = req.user._id;

  if (!userId || !courseId)
    return res.status(400).json({ error: "userId và courseId bắt buộc" });

  try {
    let convo = await Conversation.findOne({
      course: courseId,
      members: { $all: [me, userId] },
    });

    if (!convo) {
      convo = await Conversation.create({
        course: courseId,
        members: [me, userId],
      });
    }

    res.json(convo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể tạo conversation" });
  }
});
// Lấy list conversation cho teacher
router.get("/teacher/:courseId", authMiddleware, async (req, res) => {
  const teacherId = req.user._id;
  const { courseId } = req.params;

  try {
    const convos = await Conversation.find({
      course: courseId,
      members: teacherId, // teacher phải có trong members
    }).populate("members", "fullName") // lấy tên học viên
      .sort({ createdAt: -1 });

    res.json({ convos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// Lấy messages của conversation
router.get("/:conversationId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });

    // ✅ Manual populate từng message
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.sender).select("_id fullName name email avatarUrl");
        
        return {
          _id: msg._id,
          conversationId: msg.conversationId,
          text: msg.text,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
          sender: sender ? {
            _id: sender._id,
            fullName: sender.fullName || sender.name || sender.email,
            email: sender.email,
            avatarUrl: sender.avatarUrl
          } : {
            _id: msg.sender,
            fullName: "Unknown User"
          }
        };
      })
    );

    console.log("📨 First message:", populatedMessages[0]);
    res.json({ messages: populatedMessages });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// Gửi message
router.post("/message", authMiddleware, async (req, res) => {
  const { conversationId, text } = req.body;

  if (!conversationId) return res.status(400).json({ error: "conversationId bắt buộc" });
  if (!text) return res.status(400).json({ error: "Nội dung không hợp lệ" });

  try {
    // Tạo message
    const msg = await Message.create({
      conversationId,
      sender: req.user._id,
      text,
    });

    // ✅ Manual populate sender
    const sender = await User.findById(req.user._id).select("_id fullName name email avatarUrl");
    
    const populatedMsg = {
      _id: msg._id,
      conversationId: msg.conversationId,
      text: msg.text,
      createdAt: msg.createdAt,
      sender: {
        _id: sender._id,
        fullName: sender.fullName || sender.name || sender.email,
        email: sender.email,
        avatarUrl: sender.avatarUrl
      }
    };

    console.log("💬 Message created:", populatedMsg);

    // Emit qua socket
    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("receive_message", populatedMsg);
    }
    const conversation = await Conversation.findById(conversationId);
    const recipient = conversation.members.find(m => m.toString() !== req.user._id.toString());
    
    await NotificationService.notifyNewMessage(
      req.user._id,
      recipient,
      req.user.fullName,
      conversationId
    );
    res.json(populatedMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
