const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {authMiddleware} = require("../middleware/auth");

router.post("/check-level-upgrade", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || !user.roles?.includes("teacher")) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải giáo viên"
      });
    }

    const stats = user.teacherStats || {
      totalStudents: 0,
      averageRating: 0,
      totalCourses: 0,
      totalEarnings: 0
    };

    const oldLevel = user.level;
    let newLevel = "bronze";

    // ✅ Xác định level mới dựa trên stats
    if (stats.totalStudents > 20000 && stats.averageRating >= 4.8) {
      newLevel = "platinum";
    } else if (stats.totalStudents > 5000 && stats.averageRating >= 4.5) {
      newLevel = "gold";
    } else if (stats.totalStudents > 1000 && stats.averageRating >= 4.0) {
      newLevel = "silver";
    } else {
      newLevel = "bronze";
    }

    // ✅ Update level nếu thay đổi
    if (oldLevel !== newLevel) {
      user.level = newLevel;
      await user.save();

      console.log(`🎉 Teacher ${userId} upgraded: ${oldLevel} → ${newLevel}`);

      return res.json({
        success: true,
        message: `🎉 Chúc mừng! Bạn đã nâng cấp từ ${oldLevel} lên ${newLevel}`,
        upgraded: true,
        oldLevel,
        newLevel,
        user: {
          level: user.level,
          teacherStats: user.teacherStats
        }
      });
    }

    res.json({
      success: true,
      message: "Không có thay đổi level",
      upgraded: false,
      currentLevel: oldLevel,
      user: {
        level: user.level,
        teacherStats: user.teacherStats
      }
    });

  } catch (err) {
    console.error("❌ Check level error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// Lấy danh sách khóa học đã đăng ký
router.get("/my-courses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json(user.enrolledCourses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
     if (user.roles?.includes("teacher")) {
      const stats = user.teacherStats || {
        totalStudents: 0,
        averageRating: 0,
        totalCourses: 0,
        totalEarnings: 0
      };

      const oldLevel = user.level;
      let newLevel = "bronze";

      // Xác định level
      if (stats.totalStudents > 20000 && stats.averageRating >= 4.8) {
        newLevel = "platinum";
      } else if (stats.totalStudents > 5000 && stats.averageRating >= 4.5) {
        newLevel = "gold";
      } else if (stats.totalStudents > 1000 && stats.averageRating >= 4.0) {
        newLevel = "silver";
      } else {
        newLevel = "bronze";
      }

      // Update nếu thay đổi
      if (oldLevel !== newLevel) {
        user.level = newLevel;
        await user.save();
        console.log(`🎉 Auto upgrade: ${oldLevel} → ${newLevel}`);
      }
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});
// ✏️ Cập nhật thông tin tài khoản
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, avatarUrl, email } = req.body;

    // ⚠️ Không cho sửa role hoặc password ở đây
    const updatedFields = {};
    if (fullName) updatedFields.fullName = fullName;
    if (avatarUrl) updatedFields.avatarUrl = avatarUrl;
    if (email) updatedFields.email = email;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công!",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

module.exports = router;
