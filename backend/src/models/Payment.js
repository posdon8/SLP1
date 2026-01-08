// src/models/Payment.js
 /* const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // ========== STUDENT & COURSE ==========
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  }],
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  teacherIds: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // ========== PRICING & DISCOUNT ==========
  originalPrice: {
    type: Number,
    required: true
    // Giá gốc của khóa học
  },
  amount: {
    type: Number,
    required: true
    // Giá cuối cùng sau tất cả discount
  },

  // ✅ COUPON DISCOUNT
  couponCode: {
    type: String,
    default: null
    // Mã voucher/coupon (nếu có)
  },
  couponDiscount: {
    type: Number,
    default: 0
    // Số tiền giảm từ coupon
  },

  // ✅ TIER DISCOUNT
  studentTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
    // Hạng thành viên của học viên
  },
  tierDiscountPercent: {
    type: Number,
    default: 0
    // % giảm theo tier (0%, 5%, 10%, 15%)
  },
  tierDiscount: {
    type: Number,
    default: 0
    // Số tiền giảm từ tier
  },

  // ⭐ COMMISSION INFO
  teacherLevel: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
  },
  teacherEarns: {
    type: Number,
    default: 0
    // Số tiền giáo viên nhận (tính từ amount, không phải originalPrice)
  },
  platformFee: {
    type: Number,
    default: 0
    // Số tiền platform nhận
  },

  // ========== PAYMENT INFO ==========
  paymentMethod: {
    type: String,
    enum: ["sepay", "stripe", "paypal", "bank_transfer"],
    default: "sepay"
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  transactionId: {
    type: String,
    default: null
    // ID từ payment gateway
  },

  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },

  // ========== NOTES ==========
  notes: String
});

// ✅ Index để query nhanh
paymentSchema.index({ studentId: 1, createdAt: -1 });
paymentSchema.index({ teacherId: 1, createdAt: -1 });
paymentSchema.index({ courseId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ couponCode: 1 });
paymentSchema.index({ transactionId: 1 });

// ✅ Virtual field để tính tổng discount
paymentSchema.virtual('totalDiscount').get(function() {
  return (this.couponDiscount || 0) + (this.tierDiscount || 0);
});

// ✅ Virtual field để tính discount percent
paymentSchema.virtual('discountPercent').get(function() {
  if (!this.originalPrice) return 0;
  return Math.round((this.totalDiscount / this.originalPrice) * 100);
});

// Enable virtual fields in JSON
paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Payment", paymentSchema);
*/
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // ========== STUDENT & COURSES (UPDATED) ==========
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // ✅ UPDATED: Support multiple courses
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  }],
  
  // Keep single courseId for backward compatibility
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },
  
  teacherIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  // ========== PRICING & DISCOUNT ==========
  originalPrice: {
    type: Number,
    required: true
    // Giá gốc của tất cả khóa học
  },
  amount: {
    type: Number,
    required: true
    // Giá cuối cùng sau tất cả discount
  },

  // ✅ COUPON DISCOUNT
  couponCode: {
    type: String,
    default: null
  },
  couponDiscount: {
    type: Number,
    default: 0
  },

  // ✅ TIER DISCOUNT
  studentTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  tierDiscountPercent: {
    type: Number,
    default: 0
  },
  tierDiscount: {
    type: Number,
    default: 0
  },

  // ⭐ COMMISSION INFO (UPDATED - now supports multiple teachers)
  courseBreakdown: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    courseTitle: String,
    coursePrice: Number,
    discountAmount: Number,
    finalPrice: Number,
    teacherLevel: String,
    teacherEarns: Number,
    platformFee: Number
  }],

  // Tổng cộng
  totalTeacherEarns: {
    type: Number,
    default: 0
  },
  totalPlatformFee: {
    type: Number,
    default: 0
  },

  // ========== PAYMENT INFO ==========
  paymentMethod: {
    type: String,
    enum: ["sepay", "stripe", "paypal", "bank_transfer"],
    default: "sepay"
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  transactionId: {
    type: String,
    default: null
  },

  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },

  notes: String
});

// ✅ Indexes
paymentSchema.index({ studentId: 1, createdAt: -1 });
paymentSchema.index({ teacherIds: 1, createdAt: -1 });
paymentSchema.index({ courseIds: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ couponCode: 1 });
paymentSchema.index({ transactionId: 1 });

// ✅ Virtual fields
paymentSchema.virtual('totalDiscount').get(function() {
  return (this.couponDiscount || 0) + (this.tierDiscount || 0);
});

paymentSchema.virtual('courseCount').get(function() {
  return this.courseIds?.length || (this.courseId ? 1 : 0);
});

paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Payment", paymentSchema);