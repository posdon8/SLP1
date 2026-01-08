const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: "" },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false }, // Test case ẩn (chống gian lận)
  points: { type: Number, default: 1 }, // Điểm cho test case này
});

const exerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  category: {
    type: String,
    default: "General",
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  // Ngôn ngữ được phép
  allowedLanguages: {
    type: [String],
    default: ["python", "javascript", "cpp", "java"],
  },
  // Test cases
  testCases: {
    type: [testCaseSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: "Phải có ít nhất 1 test case",
    },
  },
  // Starter code cho từng ngôn ngữ
  starterCode: {
    python: { type: String, default: "def solution():\n    pass" },
    javascript: { type: String, default: "function solution() {\n    // code here\n}" },
    cpp: { type: String, default: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // code here\n    return 0;\n}" },
    java: { type: String, default: "public class Solution {\n    public static void main(String[] args) {\n        // code here\n    }\n}" },
  },
  // Giới hạn thời gian (ms)
  timeLimit: {
    type: Number,
    default: 5000,
  },
  // Giới hạn bộ nhớ (MB)
  memoryLimit: {
    type: Number,
    default: 256,
  },
  // Tổng điểm
  totalPoints: {
    type: Number,
    default: 100,
  },
  // Người tạo
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // ✅ Giới hạn số lần làm bài
  maxAttempts: {
    type: Number,
    default: 0, // 0 = vô hạn
  },
  // Trạng thái
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "draft",
  },
  // Deadline (nếu có)
  deadline: {
    type: Date,
  },
  // Thống kê
  submissionCount: {
    type: Number,
    default: 0,
  },
  acceptedCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Virtual: acceptance rate
exerciseSchema.virtual("acceptanceRate").get(function() {
  if (this.submissionCount === 0) return 0;
  return ((this.acceptedCount / this.submissionCount) * 100).toFixed(2);
});

exerciseSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Exercise", exerciseSchema);