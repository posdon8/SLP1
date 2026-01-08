// backend/routes/notifications.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middleware/auth");

// Lấy danh sách notifications
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: req.user._id };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate("sender", "fullName avatarUrl")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Đánh dấu đã đọc
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Đánh dấu tất cả đã đọc
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Xóa notification
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Xóa tất cả đã đọc
router.delete("/read/all", authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user._id,
      isRead: true
    });

    res.json({ success: true, message: "All read notifications deleted" });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;