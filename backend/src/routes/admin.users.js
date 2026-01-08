const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ========================================
// GET /admin/users - Lấy danh sách users
// ========================================
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { search, role, level, page = 1, limit = 20 } = req.query;

    let conditions = [];

    // Search by username, email, fullName
    if (search && search.trim()) {
      conditions.push({
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Filter by role
    if (role) {
      conditions.push({ roles: role });
    }

    // Filter by level (teacher level)
    if (level) {
      conditions.push({ level });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Fetch users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách users",
      error: error.message,
    });
  }
});

// ========================================
// GET /admin/users/:id - Chi tiết 1 user
// ========================================
router.get("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("enrolledCourses", "title thumbnail price");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("❌ Fetch user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thông tin user",
      error: error.message,
    });
  }
});

// ========================================
// POST /admin/users - Tạo user mới
// ========================================
router.post("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, password, fullName, roles, level, avatarUrl } = req.body;

    // Validation
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username là bắt buộc",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password phải có ít nhất 6 ký tự",
      });
    }

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Họ tên là bắt buộc",
      });
    }

    // Check username đã tồn tại
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username đã tồn tại",
      });
    }

    // Check email đã tồn tại (nếu có)
    if (email) {
      const existingEmail = await User.findOne({ email: email.trim() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email đã tồn tại",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username: username.trim(),
      email: email?.trim() || undefined,
      password: hashedPassword,
      fullName: fullName.trim(),
      roles: roles && Array.isArray(roles) ? roles : ["student"],
      level: level || "bronze",
      avatarUrl: avatarUrl || null,
    });

    await newUser.save();

    const userResponse = await User.findById(newUser._id).select("-password");

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "Tạo user thành công",
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi tạo user",
      error: error.message,
    });
  }
});

// ========================================
// PUT /admin/users/:id - Cập nhật user
// ========================================
router.put("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fullName, email, roles, level, avatarUrl, studentTier } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }
    
    // Update fields
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (email !== undefined) user.email = email.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    
    // Update roles
    if (roles && Array.isArray(roles)) {
      user.roles = roles;
    }

    // ⭐ UPDATE LEVEL WITH AUTO LOCK
    if (level && ["bronze", "silver", "gold", "platinum"].includes(level)) {
      user.level = level;
      user.manualLevelLocked = true;  // ✅ Lock auto-update
      console.log(`🔒 Admin locked level to: ${level}`);
    }

    // Update student tier
    if (studentTier) {
      user.studentTier = {
        ...user.studentTier,
        ...studentTier,
      };
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      success: true,
      data: updatedUser,
      message: `✅ Cập nhật user thành công. Level đã được khóa!`,
    });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi cập nhật user",
      error: error.message,
    });
  }
});

// ========================================
// ✅ PUT /admin/users/:id/lock-level - Khóa level
// ========================================
router.put(
  "/users/:id/lock-level",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy user" 
        });
      }

      if (!user.roles.includes("teacher")) {
        return res.status(400).json({ 
          success: false, 
          message: "Chỉ có thể khóa level của teacher" 
        });
      }

      user.manualLevelLocked = true;
      await user.save();

      res.json({
        success: true,
        message: `🔒 Level "${user.level}" đã được khóa. Auto-update sẽ không hoạt động`,
        data: {
          level: user.level,
          manualLevelLocked: user.manualLevelLocked
        }
      });
    } catch (error) {
      console.error("❌ Lock level error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi khóa level",
        error: error.message
      });
    }
  }
);

// ========================================
// ✅ PUT /admin/users/:id/unlock-level - Mở khóa
// ========================================
router.put(
  "/users/:id/unlock-level",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy user" 
        });
      }

      if (!user.roles.includes("teacher")) {
        return res.status(400).json({ 
          success: false, 
          message: "Chỉ có thể mở khóa level của teacher" 
        });
      }

      user.manualLevelLocked = false;
      await user.save();

      console.log(`🔓 Level unlocked. Auto update activated. New level: ${user.level}`);

      res.json({
        success: true,
        message: `✅ Đã mở khóa. Auto-update đã kích hoạt. Level tính toán lại: ${user.level}`,
        data: {
          level: user.level,
          manualLevelLocked: user.manualLevelLocked,
          teacherStats: user.teacherStats
        }
      });
    } catch (error) {
      console.error("❌ Unlock level error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi mở khóa level",
        error: error.message
      });
    }
  }
);

// ========================================
// ✅ POST /admin/users/:id/recalculate-level
// ========================================
router.post(
  "/users/:id/recalculate-level",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy user" 
        });
      }

      if (!user.roles.includes("teacher")) {
        return res.status(400).json({ 
          success: false, 
          message: "Chỉ có thể recalculate level của teacher" 
        });
      }

      const oldLevel = user.level;
      user.manualLevelLocked = false;
      await user.save();

      res.json({
        success: true,
        message: `🔄 Đã tính toán lại level`,
        data: {
          oldLevel,
          newLevel: user.level,
          changed: oldLevel !== user.level,
          teacherStats: {
            totalStudents: user.teacherStats.totalStudents,
            averageRating: user.teacherStats.averageRating,
            totalCourses: user.teacherStats.totalCourses,
          }
        }
      });
    } catch (error) {
      console.error("❌ Recalculate level error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi tính toán lại level",
        error: error.message
      });
    }
  }
);

// ========================================
// ✅ GET /admin/users/:id/level-info
// ========================================
router.get(
  "/users/:id/level-info",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select(
        "username fullName level manualLevelLocked teacherStats roles"
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy user" 
        });
      }

      if (!user.roles.includes("teacher")) {
        return res.status(400).json({ 
          success: false, 
          message: "User này không phải teacher" 
        });
      }

      // ⭐ Tính toán level dự kiến
      let expectedLevel = "bronze";
      const stats = user.teacherStats;

      if (stats.totalStudents > 20000 && stats.averageRating >= 4.8) {
        expectedLevel = "platinum";
      } else if (stats.totalStudents > 5000 && stats.averageRating >= 4.5) {
        expectedLevel = "gold";
      } else if (stats.totalStudents > 1000 && stats.averageRating >= 4.0) {
        expectedLevel = "silver";
      }

      res.json({
        success: true,
        data: {
          username: user.username,
          fullName: user.fullName,
          currentLevel: user.level,
          manualLevelLocked: user.manualLevelLocked,
          expectedLevel: expectedLevel,
          willChangeIfUnlocked: user.level !== expectedLevel,
          teacherStats: {
            totalStudents: stats.totalStudents,
            averageRating: stats.averageRating?.toFixed(2),
            totalCourses: stats.totalCourses,
          },
          criteria: {
            bronze: "Mặc định",
            silver: "1000+ students & 4.0+ rating",
            gold: "5000+ students & 4.5+ rating",
            platinum: "20000+ students & 4.8+ rating"
          }
        }
      });
    } catch (error) {
      console.error("❌ Get level info error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi lấy thông tin level",
        error: error.message
      });
    }
  }
);

// ========================================
// PUT /admin/users/:id/reset-password
// ========================================
router.put("/users/:id/reset-password", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password phải có ít nhất 6 ký tự",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: "Reset password thành công",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi reset password",
      error: error.message,
    });
  }
});

// ========================================
// DELETE /admin/users/:id - Xóa user
// ========================================
router.delete("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    // Không cho xóa chính mình
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa chính bạn",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Xóa user thành công",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa user",
      error: error.message,
    });
  }
});

// ========================================
// GET /admin/users/stats/overview
// ========================================
router.get("/stats/overview", authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ roles: "student" });
    const teachers = await User.countDocuments({ roles: "teacher" });
    const admins = await User.countDocuments({ roles: "admin" });

    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10);

    const levelStats = await User.aggregate([
      { $match: { roles: "teacher" } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        students,
        teachers,
        admins,
        recentUsers,
        levelStats,
      },
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
});

module.exports = router;