const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    teacherId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null
    },
    type: {
      type: String,
      enum: ["single", "multiple", "text"],
      required: true,
      default: "single"
    },
    scope: {
      type: String,
      enum: ["global", "local"],
      required: true
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    chapter: { 
      type: String, 
      required: true, 
      default: "Chưa phân loại" 
    },
    questionText: { 
      type: String, 
      required: true 
    },

    // ===== Cho câu hỏi single choice & multiple choice =====
    options: { 
      type: [String], 
      default: [] 
    },
    correctAnswer: { 
      type: Number, 
      default: null  // Cho single choice
    },
    multipleCorrectAnswers: { 
      type: [Number], 
      default: []  // Cho multiple choice
    },

    // ===== Cho câu hỏi tự luận (text) =====
    keywords: { 
      type: [String], 
      default: []  // Danh sách từ khóa chấp nhận
    },
    caseSensitive: { 
      type: Boolean, 
      default: false  // Phân biệt chữ hoa/thường
    },

    // ===== Chung cho tất cả =====
    explanation: { 
      type: String, 
      default: "" 
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
  },
  { timestamps: true }
);

// Indexes
questionBankSchema.index({ teacherId: 1, type: 1, chapter: 1 });
questionBankSchema.index({ teacherId: 1, type: 1, courseId: 1, chapter: 1 });
questionBankSchema.index({ createdAt: -1 });

module.exports = mongoose.model("QuestionBank", questionBankSchema);