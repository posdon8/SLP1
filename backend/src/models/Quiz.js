const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["single", "multiple", "text"],
    required: true,
  },
  
  questionText: { type: String, required: true },
  options: [String],
  correctAnswer: Number , // index của đáp án đúng
  explanation: String,
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium" 
  },
  multipleCorrectAnswers: [Number],
  keywords: [String], // ["Hà Nội", "Ha Noi"] - chấp nhận cả tiếng Việt và không dấu
  caseSensitive: { type: Boolean, default: false }
});

const quizSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
  title: { type: String, required: true },
  questions: [questionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  timeLimit: { type: Number, required: true, default: 0 },
  maxAttempts: {
  type: Number,
  default: 0,  // 0 = vô hạn, >0 = giới hạn
  min: 0
},
});

module.exports = mongoose.model("Quiz", quizSchema);
