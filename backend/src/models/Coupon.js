const mongoose = require("mongoose");
const couponSchema = new mongoose.Schema({
    // Coupon info
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },

    description: {
        type: String,
        default: ""
    },

    // Discount type
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
        // percentage: -10% = 0.1 * price
        // fixed: -50,000đ = 50000 VND
    },

    discountValue: {
        type: Number,
        required: true,
        min: 0
    },

    // Usage limits
    maxUses: {
        type: Number,
        default: null  // null = unlimited
    },

    usedCount: {
        type: Number,
        default: 0
    },

    // Applicable courses (null = all courses)
    applicableCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }],

    // Student tier requirement
    minStudentTier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', null],
        default: null  // null = no requirement
    },

    // Date range
    startDate: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        default: null  // null = never expires
    },

    // Active status
    isActive: {
        type: Boolean,
        default: true
    },

    // Created by
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  // Admin or teacher
        required: true
    },

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

// ✅ Index for queries
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });
couponSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Coupon", couponSchema);