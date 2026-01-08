const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Exercise = require("../models/Exercise");
const { authMiddleware } = require("../middleware/auth");
const mongoose = require("mongoose");

// ========================================
// ✅ SPECIFIC ROUTES - PHẢI TRƯỚC GENERIC ROUTES
// ========================================

// ========================================
// GET /stats/my-progress - Thống kê tiến độ cá nhân
// ========================================
router.get("/stats/my-progress", authMiddleware, async (req, res) => {
  try {
    const totalSubmissions = await Submission.countDocuments({
      student: req.user._id,
    });

    const acceptedSubmissions = await Submission.countDocuments({
      student: req.user._id,
      status: "Accepted",
    });

    const solvedExercises = await Submission.distinct("exercise", {
      student: req.user._id,
      status: "Accepted",
    });

    const recentSubmissions = await Submission.find({
      student: req.user._id,
    })
      .populate("exercise", "title difficulty")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalSubmissions,
        acceptedSubmissions,
        solvedExercises: solvedExercises.length,
        acceptanceRate: totalSubmissions > 0
          ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2)
          : 0,
        recentSubmissions,
      },
    });
  } catch (error) {
    console.error("❌ Fetch progress error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê tiến độ",
      error: error.message,
    });
  }
});

// ========================================
// GET /exercise/:exerciseId/count - Đếm submission của student cho exercise
// ========================================
router.get("/exercise/:exerciseId/count", authMiddleware, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      return res.status(400).json({
        success: false,
        message: "exerciseId không hợp lệ",
      });
    }

    const count = await Submission.countDocuments({
      exercise: new mongoose.Types.ObjectId(exerciseId),
      student: req.user._id,
    });

    console.log(`📊 Student ${req.user._id} có ${count} submission cho exercise ${exerciseId}`);

    res.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error("❌ Error counting submissions:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// ========================================
// GET /exercise/:exerciseId/my-best - Lấy submission tốt nhất của user
// ========================================
router.get("/exercise/:exerciseId/my-best", authMiddleware, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      exercise: req.params.exerciseId,
      student: req.user._id,
    })
      .sort({ score: -1, createdAt: -1 })
      .populate("exercise", "title difficulty totalPoints");

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("❌ Fetch best submission error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải bài nộp tốt nhất",
      error: error.message,
    });
  }
});

// ========================================
// GET /stats/student/:courseId - Thống kê code của student
// ========================================
router.get("/stats/student/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "courseId không hợp lệ",
      });
    }

    // Lấy tất cả exercises của course
    const exercises = await Exercise.find({ courseId }).select("_id title difficulty");
    const exerciseIds = exercises.map(e => e._id);

    // Tính toán stats
    const totalSubmissions = await Submission.countDocuments({
      student: req.user._id,
      exercise: { $in: exerciseIds },
    });

    const acceptedSubmissions = await Submission.countDocuments({
      student: req.user._id,
      exercise: { $in: exerciseIds },
      status: "Accepted",
    });

    const solvedExercises = await Submission.distinct("exercise", {
      student: req.user._id,
      exercise: { $in: exerciseIds },
      status: "Accepted",
    });

    // Chi tiết theo bài tập
    const exerciseStats = [];
    for (const exercise of exercises) {
      const submissions = await Submission.find({
        student: req.user._id,
        exercise: exercise._id,
      }).sort({ createdAt: -1 });

      if (submissions.length > 0) {
        const best = submissions.reduce((max, sub) => 
          (sub.score || 0) > (max.score || 0) ? sub : max
        );

        exerciseStats.push({
          exerciseId: exercise._id,
          title: exercise.title,
          difficulty: exercise.difficulty,
          submissionCount: submissions.length,
          bestStatus: best.status,
          bestScore: best.score || 0,
          lastSubmission: submissions[0].createdAt,
        });
      }
    }

    // Lần nộp gần đây
    const recentSubmissions = await Submission.find({
      student: req.user._id,
      exercise: { $in: exerciseIds },
    })
      .populate("exercise", "title")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("exercise status score maxScore createdAt");

    res.json({
      success: true,
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: totalSubmissions > 0
          ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1)
          : 0,
        solvedExercises: solvedExercises.length,
        exercises: exerciseStats,
        recentSubmissions: recentSubmissions.map(sub => ({
          exerciseTitle: sub.exercise?.title,
          status: sub.status,
          score: sub.score,
          maxScore: sub.maxScore,
          createdAt: sub.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching student code stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê",
      error: error.message,
    });
  }
});

// ========================================
// GET /stats/teacher/:courseId - Thống kê code của teacher (tất cả students)
// ========================================
router.get("/stats/teacher/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "courseId không hợp lệ",
      });
    }

    // Lấy course để check quyền và lấy danh sách students
    const Course = require("../models/Course");
    const course = await Course.findById(courseId).populate("students", "_id fullName");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy course",
      });
    }

    // Check quyền - chỉ teacher mới xem được
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem thống kê này",
      });
    }

    // Lấy tất cả exercises của course
    const exercises = await Exercise.find({ courseId }).select("_id title difficulty");
    const exerciseIds = exercises.map(e => e._id);

    // Tính toán stats toàn class
    const totalSubmissions = await Submission.countDocuments({
      exercise: { $in: exerciseIds },
    });

    const acceptedCount = await Submission.countDocuments({
      exercise: { $in: exerciseIds },
      status: "Accepted",
    });

    // Chi tiết theo bài tập
    const exerciseStatsPromises = exercises.map(async (exercise) => {
      const submissions = await Submission.find({
        exercise: exercise._id,
      });

      const accepted = submissions.filter(s => s.status === "Accepted").length;
      const avgScore = submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length
        : 0;

      // Kết quả từng student
      const studentStats = [];
      const studentMap = new Map();

      for (const sub of submissions) {
        if (!studentMap.has(sub.student.toString())) {
          const student = course.students.find(s => s._id.toString() === sub.student.toString());
          studentMap.set(sub.student.toString(), {
            studentId: sub.student,
            studentName: student?.fullName || "Unknown",
            submissionCount: 0,
            bestScore: 0,
            bestStatus: "Not Submitted",
            lastSubmission: null,
          });
        }

        const student = studentMap.get(sub.student.toString());
        student.submissionCount++;

        if ((sub.score || 0) > student.bestScore) {
          student.bestScore = sub.score || 0;
          student.bestStatus = sub.status;
        }

        if (!student.lastSubmission || new Date(sub.createdAt) > new Date(student.lastSubmission)) {
          student.lastSubmission = sub.createdAt;
        }
      }

      return {
        _id: exercise._id,
        title: exercise.title,
        difficulty: exercise.difficulty,
        submissionCount: submissions.length,
        acceptedCount: accepted,
        acceptanceRate: submissions.length > 0
          ? ((accepted / submissions.length) * 100).toFixed(1)
          : 0,
        avgScore,
        studentStats: Array.from(studentMap.values()),
      };
    });

    const exerciseStats = await Promise.all(exerciseStatsPromises);

    res.json({
      success: true,
      stats: {
        totalStudents: course.students.length,
        totalSubmissions,
        acceptedCount,
        acceptanceRate: totalSubmissions > 0
          ? ((acceptedCount / totalSubmissions) * 100).toFixed(1)
          : 0,
        exercises: exerciseStats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching teacher code stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê",
      error: error.message,
    });
  }
});
// ========================================
// GET /exercise/:exerciseId/leaderboard - Bảng xếp hạng
// ========================================
router.get("/exercise/:exerciseId/leaderboard", authMiddleware, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.exerciseId);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập",
      });
    }

    // ✅ Lấy submission tốt nhất của mỗi user
    const leaderboard = await Submission.aggregate([
      {
        $match: {
          exercise: exercise._id,
          status: { $in: ["Accepted", "Partial"] },
        },
      },
      {
        $sort: { score: -1, totalExecutionTime: 1, createdAt: 1 },
      },
      {
        $group: {
          _id: "$student",
          bestSubmission: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$bestSubmission" },
      },
      {
        $sort: { score: -1, totalExecutionTime: 1, createdAt: 1 },
      },
      {
        $limit: 100,
      },
    ]);

    // Populate student info
    await Submission.populate(leaderboard, {
      path: "student",
      select: "fullName email avatarUrl",
    });

    res.json({
      success: true,
      data: leaderboard.map((s, index) => ({
        rank: index + 1,
        student: s.student,
        score: s.score,
        maxScore: s.maxScore,
        totalExecutionTime: s.totalExecutionTime,
        language: s.language,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ Fetch leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải bảng xếp hạng",
      error: error.message,
    });
  }
});

// ========================================
// ✅ GENERIC ROUTES - PHẢI TRONG CÙNG (sau specific routes)
// ========================================

// ========================================
// GET / - Lấy danh sách submissions
// ========================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { exerciseId, status, page = 1, limit = 20 } = req.query;

    let conditions = [];

    // ✅ Student chỉ xem submission của mình
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher")) {
      conditions.push({ student: req.user._id });
    }

    // Filter by exercise
    if (exerciseId) {
      conditions.push({ exercise: exerciseId });
    }

    // Filter by status
    if (status) {
      conditions.push({ status });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await Submission.find(query)
      .populate("exercise", "title difficulty totalPoints")
      .populate("student", "fullName email avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Fetch submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bài nộp",
      error: error.message,
    });
  }
});

// ========================================
// GET /:id - Lấy chi tiết submission
// ========================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("exercise", "title difficulty totalPoints testCases")
      .populate("student", "fullName email avatarUrl");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài nộp",
      });
    }

    // ✅ Check quyền xem
    const isOwner = submission.student._id.toString() === req.user._id.toString();
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher") && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem bài nộp này",
      });
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("❌ Fetch submission error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải bài nộp",
      error: error.message,
    });
  }
});

module.exports = router;