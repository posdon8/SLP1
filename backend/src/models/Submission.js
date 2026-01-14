const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema({
  testCaseIndex: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Accepted", "Wrong Answer", "Runtime Error", "Time Limit Exceeded", "Memory Limit Exceeded"],
    required: true,
  },
  input: { type: String },
  expectedOutput: { type: String },
  actualOutput: { type: String },
  executionTime: { type: Number }, // ms
  memory: { type: Number }, // MB
  error: { type: String },
  points: { type: Number, default: 0 },
});

const submissionSchema = new mongoose.Schema({
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exercise",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: ["python", "javascript", "cpp", "java"],
  },
  code: {
    type: String,
    required: true,
  },
  // Kết quả tổng thể
  status: {
    type: String,
    enum: [
      "Pending",      // Đang chờ chấm
      "Judging",      // Đang chấm
      "Accepted",     // AC - Pass all tests
      "Partial",      // Pass một số tests
      "Wrong Answer", // WA
      "Runtime Error", // RE
      "Time Limit Exceeded", // TLE
      "Memory Limit Exceeded", // MLE
      "Compilation Error", // CE
    ],
    default: "Pending",
  },
  // Kết quả từng test case
  testResults: [testResultSchema],
  // Điểm số
  score: {
    type: Number,
    default: 0,
  },
  maxScore: {
    type: Number,
    required: true,
  },
  // Thời gian thực thi tổng (ms)
  totalExecutionTime: {
    type: Number,
    default: 0,
  },
  // Bộ nhớ dùng tối đa (MB)
  maxMemoryUsed: {
    type: Number,
    default: 0,
  },
  // Lỗi compilation (nếu có)
  compilationError: {
    type: String,
  },
  // Số test pass
  passedTests: {
    type: Number,
    default: 0,
  },
  isTeacherSubmission: {
  type: Boolean,
  default: false,
},

  totalTests: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Index để query nhanh
submissionSchema.index({ exercise: 1, student: 1, createdAt: -1 });
submissionSchema.index({ student: 1, status: 1 });

// Virtual: pass rate
submissionSchema.virtual("passRate").get(function() {
  if (this.totalTests === 0) return 0;
  return ((this.passedTests / this.totalTests) * 100).toFixed(2);
});

submissionSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Submission", submissionSchema);