const express = require("express");
const router = express.Router();
const Exercise = require("../models/Exercise");
const Submission = require("../models/Submission");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { judgeSubmission } = require("../services/judgeService");
const mongoose = require("mongoose");

// ========================================
// GET / - Lấy danh sách bài tập
// ========================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, difficulty, status, search, courseId, page = 1, limit = 20 } = req.query;

    let conditions = [];

    // ✅ Teacher/Admin: xem tất cả, Student: chỉ xem published
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher")) {
      conditions.push({ status: "published" });
    }

    // ✅ Filter theo courseId nếu có
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: "courseId không hợp lệ",
        });
      }
      conditions.push({ courseId: new mongoose.Types.ObjectId(courseId) });
    }

    // Filter by category
    if (category) {
      conditions.push({ category });
    }

    // Filter by difficulty
    if (difficulty) {
      conditions.push({ difficulty });
    }

    // Filter by status (admin/teacher only)
    if (status && (req.user.roles?.includes("admin") || req.user.roles?.includes("teacher"))) {
      conditions.push({ status });
    }

    // Search
    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const exercises = await Exercise.find(query)
      .populate("author", "fullName email avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Exercise.countDocuments(query);

    res.json({
      success: true,
      data: exercises,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Fetch exercises error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bài tập",
      error: error.message,
    });
  }
});

// ========================================
// GET /course/:courseId - Lấy bài tập theo course (có filter)
// ========================================
router.get("/course/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { search, difficulty, category } = req.query;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "courseId không hợp lệ",
      });
    }

    let conditions = [{ courseId: new mongoose.Types.ObjectId(courseId) }];

    // Student chỉ xem published exercises
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher")) {
      conditions.push({ status: "published" });
    }

    // ✅ Filter by difficulty
    if (difficulty) {
      conditions.push({ difficulty });
    }

    // ✅ Filter by category
    if (category) {
      conditions.push({ category });
    }

    // ✅ Search by title or description
    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    console.log("📌 Query conditions:", query);

    const exercises = await Exercise.find(query)
      .populate("author", "fullName email avatarUrl")
      .sort({ createdAt: -1 });

    console.log("📌 Found exercises:", exercises.length);

    res.json({
      success: true,
      data: exercises,
      message: "Tải bài tập thành công",
    });
  } catch (error) {
    console.error("❌ Fetch exercises by course error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bài tập",
      error: error.message,
    });
  }
});

// ========================================
// GET /:id - Lấy chi tiết bài tập
// ========================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate("author", "fullName email avatarUrl");

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập",
      });
    }

    // ✅ Check quyền xem
    if (exercise.status !== "published") {
      const isAuthor = exercise.author._id.toString() === req.user._id.toString();
      if (!req.user.roles?.includes("admin") && !isAuthor) {
        return res.status(403).json({
          success: false,
          message: "Không có quyền xem bài tập này",
        });
      }
    }

    // ✅ Ẩn test cases ẩn với student
    let exerciseData = exercise.toJSON();
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher")) {
      exerciseData.testCases = exerciseData.testCases.map((tc) => ({
        ...tc,
        expectedOutput: tc.isHidden ? "[Hidden]" : tc.expectedOutput,
      }));
    }

    res.json({
      success: true,
      data: exerciseData,
    });
  } catch (error) {
    console.error("❌ Fetch exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải bài tập",
      error: error.message,
    });
  }
});

// ========================================
// POST / - Tạo bài tập mới (Teacher/Admin)
// ========================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    // ✅ Check quyền tạo
    if (!req.user.roles?.includes("admin") && !req.user.roles?.includes("teacher")) {
      return res.status(403).json({
        success: false,
        message: "Chỉ giáo viên và admin mới có thể tạo bài tập",
      });
    }

    const {
      title,
      description,
      difficulty,
      category,
      courseId,
      allowedLanguages,
      testCases,
      starterCode,
      timeLimit,
      memoryLimit,
      totalPoints,
      status,
      deadline,
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề và mô tả là bắt buộc",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId là bắt buộc",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "courseId không hợp lệ",
      });
    }

    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Phải có ít nhất 1 test case",
      });
    }

    const exercise = new Exercise({
      title,
      description,
      difficulty,
      category,
      courseId,
      allowedLanguages,
      testCases,
      starterCode,
      timeLimit,
      memoryLimit,
      totalPoints,
      status: req.user.roles?.includes("admin") ? status : "draft",
      deadline,
      author: req.user._id,
    });

    await exercise.save();

    const populatedExercise = await Exercise.findById(exercise._id)
      .populate("author", "fullName email avatarUrl");

    res.status(201).json({
      success: true,
      data: populatedExercise,
      message: "Tạo bài tập thành công",
    });
  } catch (error) {
    console.error("❌ Create exercise error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi tạo bài tập",
      error: error.message,
    });
  }
});

// ========================================
// PUT /:id - Cập nhật bài tập
// ========================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập",
      });
    }

    // ✅ Check quyền sửa
    const isAuthor = exercise.author.toString() === req.user._id.toString();
    if (!req.user.roles?.includes("admin") && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể chỉnh sửa bài tập của mình",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "difficulty",
      "category",
      "allowedLanguages",
      "testCases",
      "starterCode",
      "timeLimit",
      "memoryLimit",
      "totalPoints",
      "deadline",
      "status", // ✅ Cho phép update status
      "maxAttempts", // ✅ Cho phép update maxAttempts
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedExercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "fullName email avatarUrl");

    res.json({
      success: true,
      data: updatedExercise,
      message: "Cập nhật bài tập thành công",
    });
  } catch (error) {
    console.error("❌ Update exercise error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi cập nhật bài tập",
      error: error.message,
    });
  }
});

// ========================================
// DELETE /:id - Xóa bài tập
// ========================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập",
      });
    }

    // ✅ Check quyền xóa
    const isAuthor = exercise.author.toString() === req.user._id.toString();
    if (!req.user.roles?.includes("admin") && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể xóa bài tập của mình",
      });
    }

    // Xóa tất cả submissions liên quan
    await Submission.deleteMany({ exercise: req.params.id });

    await Exercise.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Xóa bài tập thành công",
    });
  } catch (error) {
    console.error("❌ Delete exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bài tập",
      error: error.message,
    });
  }
});

// ========================================
// POST /:id/submit - Nộp bài
// ========================================
router.post("/:id/submit", authMiddleware, async (req, res) => {
  try {
    const exerciseId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      return res.status(400).json({
        success: false,
        message: "exerciseId không hợp lệ",
      });
    }

    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: "Code và language là bắt buộc",
      });
    }

    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập",
      });
    }

    if (!exercise.allowedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Ngôn ngữ ${language} không được hỗ trợ cho bài tập này`,
      });
    }

    // ✅ Create submission
    const submission = new Submission({
      exercise: exercise._id,
      student: req.user._id,
      language,
      code,
      status: "Judging",
      maxScore: exercise.totalPoints,
      totalTests: exercise.testCases.length,
    });

    await submission.save();

    // ✅ Judge submission (async)
    judgeSubmission(
      code,
      language,
      exercise.testCases,
      exercise.timeLimit / 1000,
      exercise.memoryLimit * 1024
    )
      .then(async (judgeResult) => {
        submission.status = judgeResult.status;
        submission.testResults = judgeResult.testResults;
        submission.score = judgeResult.score;
        submission.passedTests = judgeResult.passedTests;
        submission.totalExecutionTime = judgeResult.totalExecutionTime;
        submission.maxMemoryUsed = judgeResult.maxMemoryUsed;

        await submission.save();

        // Update exercise stats
        exercise.submissionCount += 1;
        if (judgeResult.status === "Accepted") {
          exercise.acceptedCount += 1;
        }
        await exercise.save();
      })
      .catch(async (error) => {
        console.error("❌ Judge error:", error);
        submission.status = "Runtime Error";
        submission.testResults = [{
          testCaseIndex: 0,
          status: "Runtime Error",
          error: error.message,
        }];
        await submission.save();
      });

    res.status(201).json({
      success: true,
      data: submission,
      message: "Đã nộp bài! Đang chấm điểm...",
    });
  } catch (error) {
    console.error("❌ Submit error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi nộp bài",
      error: error.message,
    });
  }
});

module.exports = router;