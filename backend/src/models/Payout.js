// models/Payout.js - FINAL

const mongoose = require("mongoose");
const payoutRequestSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 100000  // Min 100k VND
  },
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountHolder: String
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'paid', 'rejected'],
    default: 'submitted'
  },
  reason: String,  // For rejection
  requestNumber: String,  // REQ-2025-001
  
  // ========== TIMESTAMPS ==========
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  submittedAt: Date,
  approvedAt: Date,
  paidAt: Date,
  
  // ========== LINK TO BATCH ==========
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payout'
    // Link to PayoutBatch khi được add vào batch
  }
}, { timestamps: true });

const payoutSchema = new mongoose.Schema({
  // ========== BATCH IDENTIFICATION ==========
  payoutBatch: {
    type: String,
    required: true,
    unique: true
    // Format: "PAYOUT-2025-01" hoặc "PAYOUT-2025-01-15"
  },
  
  // ========== TEACHERS IN THIS BATCH ==========
  teachers: [
    {
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      teacherName: String,
      email: String,

      // ========== PAYOUT AMOUNT ==========
      amount: {
        type: Number,
        required: true
        // Số tiền sẽ trả cho teacher
      },

      // ========== PAYMENT DETAILS ==========
      paymentCount: {
        type: Number,
        default: 0
        // Số lượng payments được included
      },

      paymentIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment"
        }
      ],

      // ✅ Chi tiết từng payment
      details: [
        {
          paymentId: mongoose.Schema.Types.ObjectId,
          amount: Number,
          courseTitle: String,
          studentName: String,
          completedAt: Date
        }
      ],

      // ========== PAYOUT STATUS ==========
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
      },

      // ========== BANK DETAILS (Optional) ==========
      // ⚠️ Ghi chú: Thông tin ngân hàng nên lấy từ Revenue model
      bankDetails: {
        bankName: String,
        accountNumber: String,
        accountHolder: String
      },

      // ========== TRANSACTION INFO ==========
      transactionId: String,
      processedDate: Date,
      failureReason: String
    }
  ],

  // ========== BATCH TOTALS ==========
  totalAmount: {
    type: Number,
    required: true
  },

  adminFee: {
    type: Number,
    default: 0
    // Phí admin nếu có
  },

  // ========== PERIOD INFO ==========
  period: {
    startDate: Date,
    endDate: Date,
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly"],
      default: "monthly"
    }
  },

  // ========== BATCH STATUS ==========
  status: {
    type: String,
    enum: ["draft", "scheduled", "processing", "completed", "failed", "cancelled"],
    default: "draft"
  },

  // ========== METADATA ==========
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
    // Admin who created this batch
  },

  notes: String,

  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now
  },

  scheduledFor: Date,
  // Ngày dự kiến process

  processedAt: {
    type: Date,
    default: null
  }
});

// ========== INDEXES ==========
payoutSchema.index({ payoutBatch: 1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ createdAt: -1 });
payoutSchema.index({ "teachers.teacherId": 1 });

// ========== VIRTUAL FIELDS ==========

// Tổng số teachers
payoutSchema.virtual("totalTeachers").get(function() {
  return this.teachers.length;
});

// Số teachers completed
payoutSchema.virtual("completedCount").get(function() {
  return this.teachers.filter(t => t.status === "completed").length;
});

// Số teachers failed
payoutSchema.virtual("failedCount").get(function() {
  return this.teachers.filter(t => t.status === "failed").length;
});

// Số teachers pending
payoutSchema.virtual("pendingCount").get(function() {
  return this.teachers.filter(t => t.status === "pending").length;
});

// Tổng số payments
payoutSchema.virtual("totalPayments").get(function() {
  return this.teachers.reduce((sum, t) => sum + (t.paymentCount || 0), 0);
});

// Completion rate
payoutSchema.virtual("completionRate").get(function() {
  const total = this.teachers.length;
  if (total === 0) return 0;
  const completed = this.completedCount;
  return Math.round((completed / total) * 100);
});

payoutSchema.set("toJSON", { virtuals: true });

module.exports = {
  Payout: mongoose.model("Payout", payoutSchema),
  PayoutRequest: mongoose.model("PayoutRequest", payoutRequestSchema)
};