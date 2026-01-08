const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        unique: true,
        required: true,  // ✅ FIX
        trim: true,
        minlength: 3
    },
    email: { 
        type: String, 
        unique: true,
 
        lowercase: true,
        trim: true
    },
    password: { type: String },
    googleId: { type: String },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    roles: {
        type: [String],
        enum: ['student', 'teacher', 'admin'],
        default: ['student']
    },
    avatarUrl: {
        type: String,
        default: null
    },
    
    // ========================
    // ✅ TEACHER LEVEL
    // ========================
    level: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze'
    },
manualLevelLocked: {
  type: Boolean,
  default: false
},
    teacherStats: {
        totalStudents: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalCourses: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now }
    },

    // ========================
    // ✅ STUDENT TIER (NEW)
    // ========================
    studentTier: {
        level: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: 'bronze'
        },
        enrolledCount: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0 },
        upgradedAt: { type: Date, default: Date.now }
    },

    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }]
}, {
    timestamps: true
});

// ========================
// ✅ AUTO-CALCULATE LEVELS
// ========================
userSchema.pre("save", function (next) {
  // Không phải teacher → bỏ qua
  if (!this.roles.includes("teacher")) return next();

  // 🔒 Admin đã khóa → không auto
  if (this.manualLevelLocked) return next();

  const stats = this.teacherStats || {};
  let newLevel = "bronze";

  if (stats.totalStudents > 20000 && stats.averageRating >= 4.8) {
    newLevel = "platinum";
  } else if (stats.totalStudents > 5000 && stats.averageRating >= 4.5) {
    newLevel = "gold";
  } else if (stats.totalStudents > 1000 && stats.averageRating >= 4.0) {
    newLevel = "silver";
  }
 if (this.level !== newLevel) {
    console.log(`🎉 Auto upgrade: ${this.level} → ${newLevel}`);
    this.level = newLevel;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);