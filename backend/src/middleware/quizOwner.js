// middleware/quizOwner.js
const Course = require("../models/Course");

module.exports = async function verifyQuizOwner(req, res, next) {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: "Thiếu courseId" });

    const course = await Course.findById(courseId).populate("teacher", "_id");
    if (!course) return res.status(404).json({ error: "Course không tồn tại" });

    if (course.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền tạo quiz cho khóa học này" });
    }

    next();
  } catch (err) {
    console.error("verifyQuizOwner:", err);
    res.status(500).json({ error: "Lỗi xác minh quyền sở hữu quiz" });
  }
};
