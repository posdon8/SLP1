const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Exercise = require("../models/Exercise");
const { authMiddleware } = require("../middleware/auth");
const checkSchedule = require("../utils/checkSchedule");
const NotificationService = require("../services/notificationService");

// ========================
// HELPER: Check if user is teacher of course
// ========================
const isTeacherOfCourse = async (courseId, userId) => {
  const course = await Course.findById(courseId);
  return course && course.teacher?.toString() === userId.toString();
};

// ========================
// HELPER: Check if user is student of course
// ========================
const isStudentOfCourse = async (courseId, userId) => {
  const course = await Course.findById(courseId);
  if (!course) return false;
  return course.students?.some(s => {
    const studentId = typeof s === "string" ? s : s?._id;
    return studentId?.toString() === userId.toString();
  });
};

// ✅ POST - Create/Update schedule (TEACHER ONLY)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId, openAt, closeAt } = req.body;

    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

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

    // ✅ CHECK: Chỉ teacher mới được set schedule
    if (teacher?.toString() !== req.user._id.toString()) {
      console.log("❌ Permission denied - not teacher");
      return res.status(403).json({ success: false, message: "Chỉ giáo viên mới có quyền" });
    }

    // Create or update schedule
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

    // Notify students
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

// ✅ GET - Get all schedules (AUTHENTICATED USERS ONLY)
router.get("/calendar/all", authMiddleware, async (req, res) => {
  try {
    // ✅ Lấy tất cả schedules - users có thể xem schedules mà họ có quyền
    // (1) Schedules của courses mà user là teacher
    // (2) Schedules của courses mà user là student
    // (3) Hoặc nếu user là admin, xem tất cả

    const isAdmin = req.user.roles?.includes('admin');
    const userId = req.user._id;

    let schedules;
    if (isAdmin) {
      // Admin xem tất cả
      schedules = await Schedule.find({ isActive: true, ownerId: { $ne: null } });
    } else {
      // User bình thường: get courses they teach or enrolled
      const teacherCourses = await Course.find({ teacher: userId }).select("_id");
      const studentCourses = await Course.find({ students: userId }).select("_id");

      const courseIds = [
        ...teacherCourses.map(c => c._id),
        ...studentCourses.map(c => c._id)
      ];

      // Get schedules for these courses
      schedules = await Schedule.find({
        isActive: true,
        $or: [
          { ownerType: "course", ownerId: { $in: courseIds } },
          // For quiz/code: find by course
          {
            ownerType: { $in: ["quiz", "code"] },
            ownerId: { $exists: true }
          }
        ]
      });
    }

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
          owner = await Exercise.findById(schedule.ownerId).select("title courseId");
          courseId = owner?.courseId;
        }

        if (owner && courseId) {
          // ✅ Check: user có quyền xem schedule này không?
          let hasAccess = isAdmin;
          if (!hasAccess) {
            hasAccess = await isTeacherOfCourse(courseId, userId) || 
                       await isStudentOfCourse(courseId, userId);
          }

          if (hasAccess) {
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
        }
      } catch (err) {
        console.error(`Error processing schedule:`, err);
        continue;
      }
    }

    res.json({ success: true, schedules: result });
  } catch (err) {
    console.error("GET /calendar/all error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET - Get specific schedule
router.get("/:ownerType/:ownerId", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.roles?.includes('admin');

    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

    // ✅ Get schedule
    const schedule = await Schedule.findOne({
      ownerType,
      ownerId,
      isActive: true
    });

    if (!schedule) {
      return res.json({ success: true, schedule: null });
    }

    // ✅ Check authorization
    let courseId;
    if (ownerType === "course") {
      courseId = ownerId;
    } else if (ownerType === "quiz") {
      const quiz = await Quiz.findById(ownerId).select("courseId");
      courseId = quiz?.courseId;
    } else if (ownerType === "code") {
      const exercise = await Exercise.findById(ownerId).select("courseId");
      courseId = exercise?.courseId;
    }

    if (!courseId) {
      return res.status(404).json({ success: false, message: "Course không tìm thấy" });
    }

    const hasAccess = isAdmin || 
                     await isTeacherOfCourse(courseId, userId) || 
                     await isStudentOfCourse(courseId, userId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Không có quyền xem" });
    }

    res.json({ success: true, schedule });
  } catch (err) {
    console.error("GET /:ownerType/:ownerId error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
});

// ✅ GET - Check if content is open
router.get("/check/:ownerType/:ownerId", authMiddleware, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.roles?.includes('admin');

    if (!["course", "quiz", "code"].includes(ownerType)) {
      return res.status(400).json({ success: false, message: "ownerType không hợp lệ" });
    }

    // ✅ Get schedule
    const schedule = await Schedule.findOne({
      ownerType,
      ownerId,
      isActive: true
    });

    // ✅ Check authorization
    let courseId;
    if (ownerType === "course") {
      courseId = ownerId;
    } else if (ownerType === "quiz") {
      const quiz = await Quiz.findById(ownerId).select("courseId");
      courseId = quiz?.courseId;
    } else if (ownerType === "code") {
      const exercise = await Exercise.findById(ownerId).select("courseId");
      courseId = exercise?.courseId;
    }

    if (!courseId) {
      return res.status(404).json({ success: false, message: "Course không tìm thấy" });
    }

    const hasAccess = isAdmin || 
                     await isTeacherOfCourse(courseId, userId) || 
                     await isStudentOfCourse(courseId, userId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    }

    // ✅ Check schedule status
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