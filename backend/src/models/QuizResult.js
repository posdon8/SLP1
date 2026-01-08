const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentName: String, // Lưu tên để dễ query
  score: {
    type: Number,
    required: true, // 0-100 (%)
  },
  correct: Number, // Số câu đúng
  total: Number, // Tổng câu
  answers: [
    {
      questionId: String,
      userAnswer: mongoose.Schema.Types.Mixed, // String, Number, or Array
      isCorrect: Boolean,
    },
  ],
  timeSpent: Number, // Thời gian làm (giây)
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // Để query nhanh
  },
});

// Index để query nhanh hơn
quizResultSchema.index({ quizId: 1, studentId: 1 });
quizResultSchema.index({ courseId: 1, studentId: 1 });
quizResultSchema.index({ quizId: 1, createdAt: -1 });

module.exports = mongoose.model("QuizResult", quizResultSchema);