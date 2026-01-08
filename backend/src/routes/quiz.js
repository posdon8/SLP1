const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const { authMiddleware } = require("../middleware/auth");
const Course = require("../models/Course");
const NotificationService = require("../services/notificationService");

console.log("✅ Quiz routes loaded successfully");

// ✅ Tạo quiz
router.post("/create", authMiddleware, async (req, res) => {
  try {
    console.log("📝 [CREATE QUIZ] Request received");
    const { courseId, lessonId, title, questions, timeLimit, maxAttempts } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      console.log("❌ [CREATE QUIZ] Course not found:", courseId);
      return res.status(404).json({ success: false, message: "Khóa học không tồn tại" });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      console.log("❌ [CREATE QUIZ] Permission denied");
      return res.status(403).json({ success: false, message: "Bạn không có quyền tạo quiz" });
    }

    const quiz = new Quiz({
      courseId,
      lessonId,
      title,
      timeLimit: timeLimit || 0,
      maxAttempts: maxAttempts || 0, // ✅ 0 = vô hạn
      questions,
      createdBy: req.user._id
    });

    await quiz.save();
    console.log("✅ [CREATE QUIZ] Saved:", quiz._id);

    await NotificationService.notifyNewQuiz(
      courseId,
      title,
      course.students,
      course.title,
      req.user._id,
      req.user.fullName
    );

    res.json({ success: true, message: "Quiz đã được tạo", quiz });
  } catch (err) {
    console.error("❌ [CREATE QUIZ] Error:", err.message);
    res.status(500).json({ success: false, error: "Không thể tạo quiz" });
  }
});

// ✅ Cập nhật quiz (kèm maxAttempts)
router.put("/:quizId", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, timeLimit, questions, maxAttempts } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz không tồn tại" });
    }

    const course = await Course.findById(quiz.courseId);
    if (
      quiz.createdBy.toString() !== req.user._id.toString() &&
      course.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Không có quyền chỉnh sửa quiz" });
    }

    quiz.title = title ?? quiz.title;
    quiz.timeLimit = timeLimit ?? quiz.timeLimit;
    quiz.questions = questions ?? quiz.questions;
    quiz.maxAttempts = maxAttempts ?? quiz.maxAttempts; // ✅ Cập nhật limit

    await quiz.save();

    res.json({
      success: true,
      message: "Quiz đã được cập nhật",
      quiz,
    });
  } catch (err) {
    console.error("❌ UPDATE QUIZ ERROR:", err);
    res.status(500).json({ success: false, message: "Không thể cập nhật quiz" });
  }
});

// ✅ Lấy quiz theo course (kèm số lần còn lại)
router.get("/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    console.log("📚 [GET QUIZZES] Course ID:", courseId);

    const quizzes = await Quiz.find({ courseId }).lean();

    // Teacher / Owner → không cần attempted
    const course = await Course.findById(courseId);
    const isTeacher = course.teacher.toString() === userId.toString();

    if (isTeacher) {
      return res.json({ success: true, quizzes });
    }

    // ✅ Student → check đã làm quiz hay chưa + số lần còn lại
    const results = await QuizResult.find({
      courseId,
      studentId: userId,
    }).select("quizId");

    const attemptCountMap = {};
    results.forEach(r => {
      const quizIdStr = r.quizId.toString();
      attemptCountMap[quizIdStr] = (attemptCountMap[quizIdStr] || 0) + 1;
    });

    const quizzesWithStatus = quizzes.map(q => {
      const quizIdStr = q._id.toString();
      const attempts = attemptCountMap[quizIdStr] || 0;
      const maxAttempts = q.maxAttempts || 0; // 0 = vô hạn
      const attemptsLeft = maxAttempts > 0 ? maxAttempts - attempts : -1; // -1 = vô hạn
      const canAttempt = maxAttempts === 0 || attempts < maxAttempts; // có thể làm tiếp không

      return {
        ...q,
        attempted: attempts > 0,
        attempts, // ✅ Số lần đã làm
        maxAttempts, // ✅ Số lần tối đa
        attemptsLeft, // ✅ Số lần còn lại (-1 = vô hạn)
        canAttempt, // ✅ Có thể làm tiếp không
      };
    });

    console.log("✅ [GET QUIZZES] Found", quizzes.length, "quizzes");

    res.json({ success: true, quizzes: quizzesWithStatus });
  } catch (err) {
    console.error("❌ [GET QUIZZES] Error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi khi lấy quiz" });
  }
});

// ✅ Xóa quiz
router.delete("/:quizId", authMiddleware, async (req, res) => {
  try {
    console.log("🗑️ [DELETE QUIZ] Quiz ID:", req.params.quizId);
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      console.log("❌ [DELETE QUIZ] Quiz not found");
      return res.status(404).json({ success: false, message: "Quiz không tồn tại" });
    }

    const course = await Course.findById(quiz.courseId);
    if (!course) {
      console.log("❌ [DELETE QUIZ] Course not found");
      return res.status(404).json({ success: false, message: "Khóa học không tồn tại" });
    }

    if (
      quiz.createdBy.toString() !== req.user._id.toString() &&
      course.teacher.toString() !== req.user._id.toString()
    ) {
      console.log("❌ [DELETE QUIZ] Permission denied");
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa quiz này" });
    }

    await quiz.deleteOne();
    console.log("✅ [DELETE QUIZ] Deleted successfully");
    res.json({ success: true, message: "Quiz đã được xóa thành công" });
  } catch (err) {
    console.error("❌ [DELETE QUIZ] Error:", err.message);
    res.status(500).json({ success: false, message: "Không thể xóa quiz" });
  }
});

// ✅ Nộp bài quiz (có kiểm tra giới hạn lần làm)
router.post("/submit/:quizId", authMiddleware, async (req, res) => {
  try {
    console.log("\n🧮 [SUBMIT QUIZ]");
    console.log("👤 User:", req.user._id, req.user.fullName);

    const { answers } = req.body;

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz không tồn tại" });
    }

    // 🔑 LẤY COURSE + CHECK OWNER
    const course = await Course.findById(quiz.courseId);

    const isOwner =
      quiz.createdBy?.toString() === req.user._id.toString() ||
      course.teacher.toString() === req.user._id.toString();

    console.log("👑 Is Owner:", isOwner);

    // ✅ CHECK ATTEMPT LIMIT (nếu không phải owner)
    if (!isOwner && quiz.maxAttempts > 0) {
      const attemptCount = await QuizResult.countDocuments({
        quizId: quiz._id,
        studentId: req.user._id,
      });

      if (attemptCount >= quiz.maxAttempts) {
        console.log(`❌ Max attempts exceeded: ${attemptCount}/${quiz.maxAttempts}`);
        return res.status(403).json({
          success: false,
          error: `Bạn đã hết lượt làm quiz. Giới hạn: ${quiz.maxAttempts} lần`,
          attemptsUsed: attemptCount,
          maxAttempts: quiz.maxAttempts,
        });
      }

      console.log(`✅ Attempt allowed: ${attemptCount + 1}/${quiz.maxAttempts}`);
    }

    let score = 0;

    const results = quiz.questions.map((q, i) => {
      let isCorrect = false;
      let userAnswer = answers[q._id];

      // ===== SINGLE =====
      if (q.type === "single" || !q.type) {
        isCorrect = q.correctAnswer === userAnswer;
        if (isCorrect) score++;

        return {
          type: "single",
          question: q.questionText,
          correct: isCorrect,
          correctAnswer: q.options[q.correctAnswer],
          yourAnswer:
            q.options[userAnswer] !== undefined
              ? q.options[userAnswer]
              : "Không chọn",
          explanation: q.explanation,
        };
      }

      // ===== MULTIPLE =====
      if (q.type === "multiple") {
        const userArr = Array.isArray(userAnswer) ? userAnswer : [];
        const correctArr = q.multipleCorrectAnswers || [];

        const isSame =
          userArr.length === correctArr.length &&
          userArr.sort().every((v, i) => v === correctArr.sort()[i]);

        if (isSame) score++;

        return {
          type: "multiple",
          question: q.questionText,
          correct: isSame,
          correctAnswers: correctArr.map(i => q.options[i]),
          yourAnswers: userArr.map(i => q.options[i]),
          explanation: q.explanation,
        };
      }

      // ===== TEXT =====
      if (q.type === "text") {
        const input = (userAnswer || "").trim();
        const keywords = q.keywords || [];

        const isMatch = q.caseSensitive
          ? keywords.includes(input)
          : keywords.some(k => k.toLowerCase() === input.toLowerCase());

        if (isMatch) score++;

        return {
          type: "text",
          question: q.questionText,
          correct: isMatch,
          yourAnswer: input || "Không trả lời",
          correctKeywords: keywords,
          explanation: q.explanation,
        };
      }
    });

    const scorePercent = ((score / quiz.questions.length) * 100).toFixed(1);

    let resultId = null;

    // 💾 CHỈ LƯU NẾU KHÔNG PHẢI OWNER
    if (!isOwner) {
      const quizResult = new QuizResult({
        quizId: quiz._id,
        courseId: quiz.courseId,
        studentId: req.user._id,
        studentName: req.user.fullName,
        score: parseInt(scorePercent),
        correct: score,
        total: quiz.questions.length,
        answers: quiz.questions.map((q, i) => ({
          questionId: q._id,
          userAnswer: answers[q._id],
          isCorrect: results[i].correct,
        })),
      });

      await quizResult.save();
      resultId = quizResult._id;

      console.log("✅ QuizResult SAVED:", resultId);
    } else {
      console.log("🧪 OWNER submit → KHÔNG LƯU KẾT QUẢ");
    }

    res.json({
      success: true,
      total: quiz.questions.length,
      correct: score,
      scorePercent,
      results,
      resultId,
      isOwner,
    });
  } catch (err) {
    console.error("❌ SUBMIT QUIZ ERROR:", err);
    res.status(500).json({ success: false, error: "Không thể chấm điểm" });
  }
});

// ✅ Lấy quiz để làm (check attempt limit)
router.get("/:quizId/play", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate({
        path: "courseId",
        select: "teacher students title",
      })
      .select("-questions.correctAnswer -questions.multipleCorrectAnswers");

    if (!quiz) {
      return res.status(404).json({ message: "Quiz không tồn tại" });
    }

    const userId = req.user._id.toString();

    const isOwner =
      quiz.courseId.teacher?.toString() === userId ||
      quiz.createdBy?.toString() === userId;

    const isStudent = quiz.courseId.students
      .map(id => id.toString())
      .includes(userId);

    if (!isOwner && !isStudent) {
      return res.status(403).json({ message: "Bạn không có quyền làm quiz này" });
    }

    // ✅ CHECK ATTEMPT LIMIT
    let attemptsLeft = -1; // -1 = vô hạn
    let canAttempt = true;

    if (!isOwner && quiz.maxAttempts > 0) {
      const attemptCount = await QuizResult.countDocuments({
        quizId: quiz._id,
        studentId: userId,
      });

      attemptsLeft = quiz.maxAttempts - attemptCount;
      canAttempt = attemptsLeft > 0;

      if (!canAttempt) {
        return res.status(403).json({
          success: false,
          message: `Bạn đã hết lượt làm quiz. Giới hạn: ${quiz.maxAttempts} lần`,
          attemptsUsed: attemptCount,
          maxAttempts: quiz.maxAttempts,
        });
      }
    }

    res.json({
      success: true,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        timeLimit: quiz.timeLimit,
        maxAttempts: quiz.maxAttempts,
        attemptsLeft, // ✅ Số lần còn lại
        questions: quiz.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          type: q.type,
        })),
      },
    });
  } catch (err) {
    console.error("❌ [PLAY QUIZ] Error:", err);
    res.status(500).json({ message: "Không thể tải quiz" });
  }
});

// ✅ Xem đáp án (check attempt limit)
router.get("/:quizId/answers", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz không tồn tại" });
    }

    const attempted = await QuizResult.findOne({
      quizId: quiz._id,
      studentId: req.user._id,
    });

    if (!attempted) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần hoàn thành quiz trước khi xem đáp án",
      });
    }

    const answers = quiz.questions.map((q) => ({
      questionId: q._id,
      questionText: q.questionText,
      type: q.type || "single",

      options: q.type === "text" ? [] : q.options,
      correctAnswer:
        q.type === "multiple"
          ? q.multipleCorrectAnswers
          : q.type === "single"
          ? q.correctAnswer
          : null,

      keywords: q.type === "text" ? q.keywords || [] : [],
      explanation: q.explanation || "",
    }));

    res.json({
      success: true,
      quizTitle: quiz.title,
      answers,
    });
  } catch (err) {
    console.error("❌ GET ANSWERS ERROR:", err);
    res.status(500).json({ success: false, message: "Không thể tải đáp án" });
  }
});

// ✅ STUDENT STATS
router.get("/stats/student/:courseId", authMiddleware, async (req, res) => {
  try {
    console.log("📊 [STUDENT STATS] Course ID:", req.params.courseId);
    const { courseId } = req.params;
    const userId = req.user._id;

    const quizzes = await Quiz.find({ courseId });

    if (!quizzes || quizzes.length === 0) {
      console.log("ℹ️ [STUDENT STATS] No quizzes found");
      return res.json({
        success: true,
        stats: {
          totalAttempts: 0,
          highestScore: 0,
          lowestScore: 0,
          quizzes: [],
          scoreDistribution: {
            "90-100%": 0,
            "80-89%": 0,
            "60-79%": 0,
            "<60%": 0,
          },
        },
      });
    }

    let totalAttempts = 0;
    let highestScore = 0;
    let lowestScore = 100;
    const scoreDistribution = {
      "90-100%": 0,
      "80-89%": 0,
      "60-79%": 0,
      "<60%": 0,
    };

    const quizStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const results = await QuizResult.find({
          quizId: quiz._id,
          studentId: userId,
        }).sort({ createdAt: -1 });

        if (results.length === 0) {
          return null;
        }

        const scores = results.map((r) => r.score);
        const highestQuizScore = Math.max(...scores);
        const avgScore = (
          scores.reduce((a, b) => a + b, 0) / scores.length
        ).toFixed(1);

        totalAttempts += results.length;
        highestScore = Math.max(highestScore, highestQuizScore);
        lowestScore = Math.min(lowestScore, Math.min(...scores));

        scores.forEach((score) => {
          if (score >= 90) scoreDistribution["90-100%"]++;
          else if (score >= 80) scoreDistribution["80-89%"]++;
          else if (score >= 60) scoreDistribution["60-79%"]++;
          else scoreDistribution["<60%"]++;
        });

        return {
          quizId: quiz._id,
          title: quiz.title,
          maxAttempts: quiz.maxAttempts, // ✅ Trả về giới hạn
          attempts: results.length,
          highestScore: highestQuizScore,
          avgScore: parseFloat(avgScore),
          lastAttempt: results[0].createdAt,
        };
      })
    );

    const filteredQuizStats = quizStats.filter((q) => q !== null);

    console.log("✅ [STUDENT STATS] Returning", filteredQuizStats.length, "quizzes");

    res.json({
      success: true,
      stats: {
        totalAttempts,
        highestScore: highestScore === 0 ? 0 : highestScore,
        lowestScore: lowestScore === 100 ? 0 : lowestScore,
        quizzes: filteredQuizStats,
        scoreDistribution,
      },
    });
  } catch (err) {
    console.error("❌ [STUDENT STATS] Error:", err.message);
    res.status(500).json({ success: false, error: "Không thể tải thống kê" });
  }
});

// ✅ TEACHER STATS
router.get("/stats/teacher/:courseId", authMiddleware, async (req, res) => {
  try {
    console.log("📊 [TEACHER STATS] Course ID:", req.params.courseId);
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course || course.teacher.toString() !== userId.toString()) {
      console.log("❌ [TEACHER STATS] Permission denied");
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thống kê",
      });
    }

    const quizzes = await Quiz.find({ courseId });
    const totalStudents = course.students.length;
    const totalQuizzes = quizzes.length;

    let totalAttempts = 0;
    let classAvgScore = 0;

    const quizStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const results = await QuizResult.find({ quizId: quiz._id });

        if (results.length === 0) {
          return {
            _id: quiz._id,
            title: quiz.title,
            maxAttempts: quiz.maxAttempts, // ✅ Thêm
            attempts: 0,
            avgScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passCount: 0,
            studentScores: [],
          };
        }

        totalAttempts += results.length;

        const scores = results.map((r) => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);
        const passCount = scores.filter((s) => s >= 60).length;

        classAvgScore += avgScore * results.length;

        const studentScoresMap = {};
        results.forEach((result) => {
          if (!studentScoresMap[result.studentId]) {
            studentScoresMap[result.studentId] = {
              studentId: result.studentId,
              name: result.studentName || "Unknown",
              attempts: 0,
              highestScore: 0,
              lastAttempt: result.createdAt,
            };
          }
          studentScoresMap[result.studentId].attempts++;
          studentScoresMap[result.studentId].highestScore = Math.max(
            studentScoresMap[result.studentId].highestScore,
            result.score
          );
          studentScoresMap[result.studentId].lastAttempt = result.createdAt;
        });

        return {
          _id: quiz._id,
          title: quiz.title,
          maxAttempts: quiz.maxAttempts, // ✅ Thêm
          attempts: results.length,
          avgScore,
          highestScore,
          lowestScore,
          passCount,
          studentScores: Object.values(studentScoresMap),
        };
      })
    );

    const finalClassAvg = totalAttempts > 0 ? classAvgScore / totalAttempts : 0;

    console.log("✅ [TEACHER STATS] Returning stats for", totalQuizzes, "quizzes");

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuizzes,
        totalAttempts,
        classAvgScore: finalClassAvg,
        quizzes: quizStats,
      },
    });
  } catch (err) {
    console.error("❌ [TEACHER STATS] Error:", err.message);
    res.status(500).json({ success: false, error: "Không thể tải thống kê" });
  }
});

module.exports = router;