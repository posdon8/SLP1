// src/models/Revenue.js
const mongoose = require("mongoose");

const monthlyBreakdownSchema = new mongoose.Schema({
  month: {
    type: String, // "2024-01" format
    required: true
  },
  earning: {
    type: Number,
    default: 0
    // Số tiền giáo viên kiếm được trong tháng
  },
  platformFee: {
    type: Number,
    default: 0
    // Hoa hồng platform cắt trong tháng
  },
  studentCount: {
    type: Number,
    default: 0
    // Số học viên mua trong tháng
  },
  level: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
    // Level giáo viên tại thời điểm đó
  }
}, { _id: false });

const revenueSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  // ⭐ TỔNG CỘNG
  totalEarnings: {
    type: Number,
    default: 0
    // Tổng tiền giáo viên kiếm được từ đầu
  },
  platformRevenue: {
    type: Number,
    default: 0
    // Tổng tiền platform nhận từ đầu
  },

  // PENDING = chưa rút tiền
  pendingAmount: {
    type: Number,
    default: 0
  },
  
  // PAID = đã rút tiền
  paidAmount: {
    type: Number,
    default: 0
  },

  // PAYOUT TRACKING
  lastPayoutDate: Date,
  nextPayoutDate: {
    type: Date,
    // Mặc định: ngày 5 hàng tháng
  },

  // Chi tiết theo tháng
  monthlyBreakdown: [monthlyBreakdownSchema],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Auto update updatedAt
revenueSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  
  // Nếu chưa có nextPayoutDate, set ngày 5 tháng tới
  if (!this.nextPayoutDate) {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    this.nextPayoutDate = nextMonth;
  }
  
  next();
});

module.exports = mongoose.model("Revenue", revenueSchema);