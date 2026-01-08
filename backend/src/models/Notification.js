// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  senderName: String,  
  type: {
    type: String,
    enum: [
      "student_joined",  
      "pending_enrollment",       // ← YÊU CẦU THAM GIA (chế độ manual)
      "enrollment_accepted",      // ← YÊU CẦU ĐƯỢC DUYỆT
      "enrollment_rejected",   
      "new_lesson",          // Bài giảng mới
      "new_quiz",            // Quiz mới
      "new_resource",        // Tài liệu mới
      "announcement",        // Thông báo từ giáo viên
      "new_message",
      "schedule_set"       // Tin nhắn mới
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },
  relatedId: {
    type: String  // ID của lesson, quiz, resource, conversation...
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  link: {
    type: String  // Link để chuyển đến khi click notification
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
   updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index để tìm kiếm nhanh
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);