const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Exercise = require("../models/Exercise"); // ✅ Import Exercise
const { authMiddleware } = require("../middleware/auth");
const checkSchedule = require("../utils/checkSchedule");
const NotificationService = require("../services/notificationService");

// ✅ POST - Tạo/cập nhật lịch
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId, openAt, closeAt } = req.body;

    // ✅ Hỗ trợ course, quiz, code
    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

    // Validate dates
    if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) {
      return res.status(400).json({ 
        success: false, 
        message: "Thời gian mở phải sớm hơn thời gian đóng" 
      });
    }

    let teacher;
    let students = [];
    let courseId;
    let ownerTitle = "";

    if (ownerType === "course") {
      const course = await Course.findById(ownerId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Không tìm thấy course" });
      }
      teacher = course.teacher;
      students = course.students || [];
      courseId = course._id;
      ownerTitle = course.title;
    } else if (ownerType === "quiz") {
      const quiz = await Quiz.findById(ownerId);
      if (!quiz) {
        return res.status(404).json({ success: false, message: "Không tìm thấy quiz" });
      }

      const course = await Course.findById(quiz.courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Không tìm thấy course của quiz" });
      }

      teacher = course.teacher;
      students = course.students || [];
      courseId = course._id;
      ownerTitle = quiz.title;
    } else if (ownerType === "code") {
      // ✅ Xử lý code (exercise)
      const exercise = await Exercise.findById(ownerId);
      if (!exercise) {
        return res.status(404).json({ success: false, message: "Không tìm thấy bài tập" });
      }

      const course = await Course.findById(exercise.courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Không tìm thấy course của bài tập" });
      }

      teacher = course.teacher;
      students = course.students || [];
      courseId = course._id;
      ownerTitle = exercise.title;
    }

    // ✅ Kiểm tra quyền - chỉ teacher mới được set lịch
    if (teacher?.toString() !== req.user._id.toString()) {
      console.log("❌ Permission denied:", {
        courseTeacher: teacher?.toString(),
        userId: req.user._id.toString(),
        match: teacher?.toString() === req.user._id.toString()
      });
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }

    // ✅ Tạo hoặc cập nhật schedule
    let schedule = await Schedule.findOne({ ownerType, ownerId });

    if (schedule) {
      schedule.openAt = openAt || null;
      schedule.closeAt = closeAt || null;
      schedule.isActive = true;
      await schedule.save();
      console.log("✅ Schedule updated:", schedule._id);
    } else {
      schedule = await Schedule.create({
        ownerType,
        ownerId,
        openAt: openAt || null,
        closeAt: closeAt || null,
        createdBy: req.user._id
      });
      console.log("✅ Schedule created:", schedule._id);
    }

    // ✅ Gửi notification cho students
    if (students && students.length > 0) {
      const studentIds = students
        .map(s => (typeof s === "string" ? s : s?._id))
        .filter(id => id);

      const typeLabel = ownerType === "code" ? "Bài tập Code" : ownerType === "quiz" ? "Quiz" : "Khóa học";

      await NotificationService.notifyScheduleSet(
        courseId,
        ownerType,
        ownerTitle,
        studentIds,
        req.user.fullName || "Giáo viên",
        openAt,
        closeAt,
        typeLabel
      );
    }

    res.json({ success: true, schedule });
  } catch (err) {
    console.error("❌ POST /schedules error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
});

// ✅ GET - Lấy tất cả lịch
router.get("/calendar/all", authMiddleware, async (req, res) => {
  try {
    const schedules = await Schedule.find({ isActive: true, ownerId: { $ne: null } });

    const result = [];
    for (const schedule of schedules) {
      try {
        let owner, courseId;

        if (schedule.ownerType === "course") {
          owner = await Course.findById(schedule.ownerId).select("title");
          courseId = schedule.ownerId;
        } else if (schedule.ownerType === "quiz") {
          owner = await Quiz.findById(schedule.ownerId).select("title courseId");
          courseId = owner?.courseId;
        } else if (schedule.ownerType === "code") {
          // ✅ Xử lý code
          owner = await Exercise.findById(schedule.ownerId).select("title courseId");
          courseId = owner?.courseId;
        }

        if (owner && courseId) {
          result.push({
            id: schedule._id,
            type: schedule.ownerType,
            title: owner.title || "Untitled",
            openAt: schedule.openAt || null,
            closeAt: schedule.closeAt || null,
            ownerId: owner._id,
            courseId: courseId
          });
        }
      } catch (err) {
        console.error(`Error processing schedule:`, err);
        continue;
      }
    }

    res.json({ success: true, schedules: result });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET - Lấy lịch cụ thể
router.get("/:ownerType/:ownerId", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;

    // ✅ Hỗ trợ code
    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

    const schedule = await Schedule.findOne({
      ownerType,
      ownerId,
      isActive: true
    });

    res.json({ success: true, schedule: schedule || null });
  } catch (err) {
    console.error("GET /:ownerType/:ownerId error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
});

// ✅ GET - Check xem content có đang mở không
router.get("/check/:ownerType/:ownerId", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;

    // ✅ Hỗ trợ code
    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

    const schedule = await Schedule.findOne({
      ownerType,
      ownerId,
      isActive: true
    });

    const status = checkSchedule(schedule);

    if (status !== "OPEN") {
      return res.status(403).json({
        success: false,
        status,
        message:
          status === "NOT_OPEN"
            ? "⏳ Nội dung chưa mở"
            : "❌ Nội dung đã đóng"
      });
    }

    res.json({ success: true, message: "✅ Nội dung đang mở" });
  } catch (err) {
    console.error("GET /check error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
});

module.exports = router;