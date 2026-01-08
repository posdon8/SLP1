const express = require("express");
const router = express.Router();
const QuestionBank = require("../models/QuestionBank");
const Course = require("../models/Course");
const { authMiddleware } = require("../middleware/auth");

// ============= GLOBAL ROUTES =============

// Tạo câu hỏi global (dùng chung cho tất cả courses)
router.post("/global/create", authMiddleware, async (req, res) => {
  try {
    const { 
      type, 
      chapter, 
      questionText, 
      options, 
      correctAnswer, 
      multipleCorrectAnswers,
      keywords,
      caseSensitive,
      explanation, 
      difficulty 
    } = req.body;

    // Validate dữ liệu theo type
    if (!questionText || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Cần có questionText và type" 
      });
    }

    if ((type === "single" || type === "multiple") && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ 
        success: false, 
        message: "Câu hỏi trắc nghiệm cần ít nhất 2 đáp án" 
      });
    }

    if (type === "text" && (!Array.isArray(keywords) || keywords.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Câu hỏi tự luận cần ít nhất 1 từ khóa" 
      });
    }

    const questionData = {
      teacherId: req.user._id,
      scope: "global",
      type,
      courseId: null,
      chapter: chapter || "Chưa phân loại",
      questionText,
      explanation: explanation || "",
      difficulty: difficulty || "medium",
      createdBy: req.user._id
    };

    // Thêm dữ liệu theo type
    if (type === "single") {
      questionData.options = options;
      questionData.correctAnswer = correctAnswer || 0;
    } else if (type === "multiple") {
      questionData.options = options;
      questionData.multipleCorrectAnswers = multipleCorrectAnswers || [];
    } else if (type === "text") {
      questionData.keywords = keywords || [];
      questionData.caseSensitive = caseSensitive || false;
    }

    const question = await QuestionBank.create(questionData);
    res.json({ success: true, question });
  } catch (err) {
    console.error("Error create global question:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Lấy danh sách câu hỏi global
router.get("/global", authMiddleware, async (req, res) => {
  try {
    const { chapter, q, page = 1, limit = 100 } = req.query;
    
    const query = { 
      teacherId: req.user._id, 
      scope: "global"
    };
    
    if (chapter && chapter !== "all") {
      query.chapter = chapter;
    }
    
    if (q) {
      query.questionText = { $regex: q, $options: "i" };
    }

    const questions = await QuestionBank.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const chapters = await QuestionBank.distinct("chapter", {
      teacherId: req.user._id,
      scope: "global"
    });

    res.json({ 
      success: true, 
      questions,
      chapters: chapters.filter(c => c)
    });
  } catch (err) {
    console.error("Error get global:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/global/chapters", authMiddleware, async (req, res) => {
  try {
    const chapters = await QuestionBank.distinct("chapter", { 
      teacherId: req.user._id,
      scope: "global"
    });
    res.json(chapters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Import file JSON vào Global Bank
router.post("/global/import-file", authMiddleware, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Dữ liệu import không hợp lệ" 
      });
    }

    const toInsert = questions.map(q => {
      const questionData = {
        teacherId: req.user._id,
        scope: "global",
        type: q.type || "single",
        courseId: null,
        chapter: q.chapter || "Chưa phân loại",
        questionText: q.questionText,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium",
        createdBy: req.user._id
      };

      // Thêm dữ liệu theo type
      if (q.type === "single" || !q.type) {
        questionData.options = q.options || [];
        questionData.correctAnswer = q.correctAnswer || 0;
      } else if (q.type === "multiple") {
        questionData.options = q.options || [];
        questionData.multipleCorrectAnswers = q.multipleCorrectAnswers || [];
      } else if (q.type === "text") {
        questionData.keywords = q.keywords || [];
        questionData.caseSensitive = q.caseSensitive || false;
      }

      return questionData;
    });

    const inserted = await QuestionBank.insertMany(toInsert);
    
    res.json({ 
      success: true, 
      message: `Đã import ${inserted.length} câu hỏi`,
      inserted 
    });
  } catch (err) {
    console.error("Error import global:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============= LOCAL ROUTES =============

// Tạo câu hỏi local (cho một khóa học cụ thể)
router.post("/local/create/:courseId", authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const {
      type,
      questionText,
      options,
      correctAnswer,
      multipleCorrectAnswers,
      keywords,
      caseSensitive,
      explanation,
      difficulty,
      chapter,
    } = req.body;

    const course = await Course.findById(courseId); 

    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Bạn không có quyền tạo câu hỏi" 
      });
    }

    // Validate dữ liệu theo type
    if (!questionText || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Cần có questionText và type" 
      });
    }

    if ((type === "single" || type === "multiple") && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ 
        success: false, 
        message: "Câu hỏi trắc nghiệm cần ít nhất 2 đáp án" 
      });
    }

    if (type === "text" && (!Array.isArray(keywords) || keywords.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Câu hỏi tự luận cần ít nhất 1 từ khóa" 
      });
    }

    const questionData = {
      teacherId: req.user._id,
      scope: "local",
      type,
      courseId,
      chapter: chapter || "Chưa phân loại",
      questionText,
      explanation: explanation || "",
      difficulty: difficulty || "medium",
      createdBy: req.user._id,
    };

    // Thêm dữ liệu theo type
    if (type === "single") {
      questionData.options = options;
      questionData.correctAnswer = correctAnswer || 0;
    } else if (type === "multiple") {
      questionData.options = options;
      questionData.multipleCorrectAnswers = multipleCorrectAnswers || [];
    } else if (type === "text") {
      questionData.keywords = keywords || [];
      questionData.caseSensitive = caseSensitive || false;
    }

    const question = await QuestionBank.create(questionData);

    res.json({ 
      success: true, 
      message: "Đã thêm câu hỏi vào ngân hàng", 
      question 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Không thể tạo câu hỏi" });
  }
});

// Lấy danh sách câu hỏi local của một khóa học
router.get("/local/:courseId", authMiddleware, async (req, res) => {
  try {
    const { chapter, q, page = 1, limit = 50 } = req.query;
    const courseId = req.params.courseId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: "Course not found" 
      });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Không có quyền" 
      });
    }

    const query = { 
      teacherId: req.user._id,
      scope: "local",
      courseId 
    };

    if (chapter && chapter !== "all") {
      query.chapter = chapter;
    }

    if (q) {
      query.questionText = { $regex: q, $options: "i" };
    }

    const questions = await QuestionBank.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const chapters = await QuestionBank.distinct("chapter", {
      teacherId: req.user._id,
      scope: "local",
      courseId
    });

    res.json({ 
      success: true, 
      questions, 
      chapters: chapters.filter(c => c) 
    });
  } catch (err) {
    console.error("Error get local:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Import file JSON vào Local Bank
router.post("/local/import-file/:courseId", authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { questions, chapter } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Dữ liệu import không hợp lệ" 
      });
    }

    const course = await Course.findById(courseId); 
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Bạn không có quyền import" 
      });
    }

    const toInsert = questions.map(q => {
      const questionData = {
        teacherId: req.user._id,
        scope: "local",
        type: q.type || "single",
        courseId,
        chapter: chapter || "Chưa phân loại",
        questionText: q.questionText,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium",
        createdBy: req.user._id
      };

      // Thêm dữ liệu theo type
      if (q.type === "single" || !q.type) {
        questionData.options = q.options || [];
        questionData.correctAnswer = q.correctAnswer || 0;
      } else if (q.type === "multiple") {
        questionData.options = q.options || [];
        questionData.multipleCorrectAnswers = q.multipleCorrectAnswers || [];
      } else if (q.type === "text") {
        questionData.keywords = q.keywords || [];
        questionData.caseSensitive = q.caseSensitive || false;
      }

      return questionData;
    });

    const inserted = await QuestionBank.insertMany(toInsert);

    res.json({ 
      success: true, 
      message: `Đã import ${inserted.length} câu hỏi`,
      inserted 
    });
  } catch (err) {
    console.error("Error import questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Import từ Global Bank sang Local Bank
router.post("/local/import-global/:courseId", authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Danh sách câu hỏi không hợp lệ" 
      });
    }

    const course = await Course.findById(courseId);
    
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Không có quyền import" 
      });
    }

    // Lấy các câu hỏi được chọn từ Global Bank
    const globals = await QuestionBank.find({
      _id: { $in: questionIds },
      teacherId: req.user._id,
      scope: "global"
    });

    if (!globals.length) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy câu hỏi hợp lệ" 
      });
    }

    // Copy sang local bank
    const toInsert = globals.map(g => {
      const questionData = {
        teacherId: req.user._id,
        scope: "local",
        courseId,
        chapter: g.chapter,
        questionText: g.questionText,
        explanation: g.explanation,
        difficulty: g.difficulty,
        createdBy: req.user._id,
        type: g.type
      };

      // Copy dữ liệu theo type
      if (g.type === "single") {
        questionData.options = g.options;
        questionData.correctAnswer = g.correctAnswer;
      } else if (g.type === "multiple") {
        questionData.options = g.options;
        questionData.multipleCorrectAnswers = g.multipleCorrectAnswers;
      } else if (g.type === "text") {
        questionData.keywords = g.keywords;
        questionData.caseSensitive = g.caseSensitive;
      }

      return questionData;
    });

    const inserted = await QuestionBank.insertMany(toInsert);
    
    res.json({ 
      success: true, 
      message: `Đã import ${inserted.length} câu hỏi từ Global Bank`,
      inserted 
    });
  } catch (err) {
    console.error("Error import from global:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Xóa câu hỏi
router.delete("/:questionId", authMiddleware, async (req, res) => {
  try {
    const question = await QuestionBank.findOneAndDelete({
      _id: req.params.questionId,
      teacherId: req.user._id
    });

    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy câu hỏi" 
      });
    }

    res.json({ 
      success: true, 
      message: "Đã xóa câu hỏi" 
    });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// DELETE global question
router.delete("/global/:id", authMiddleware, async (req, res) => {
  try {
    const question = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    }
    res.json({ message: "Đã xóa câu hỏi" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});
// UPDATE local question
router.put("/local/:id", authMiddleware, async (req, res) => {
  try {
    const question = await QuestionBank.findOneAndUpdate(
      {
        _id: req.params.id,
        teacherId: req.user._id,
        scope: "local"
      },
      req.body,
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    }

    res.json({ success: true, question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// UPDATE global question
router.put("/global/:id", authMiddleware, async (req, res) => {
  try {
    const updated = await QuestionBank.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;