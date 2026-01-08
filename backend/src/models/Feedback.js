// src/models/Feedback.js
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    // Người gửi feedback
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userRole: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },

    // Nội dung feedback
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 5000
    },
    category: {
        type: String,
        enum: ['bug', 'feature-request', 'improvement', 'complaint', 'other'],
        default: 'other'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },

    // Trạng thái feedback
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'resolved', 'closed'],
        default: 'pending'
    },
    adminReply: {
        type: String,
        default: null
    },
    repliedAt: {
        type: Date,
        default: null
    },

    // Metadata
    attachments: [{
        fileName: String,
        url: String
    }],
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
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);