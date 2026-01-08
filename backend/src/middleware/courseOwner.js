// middleware/courseOwner.js
const Course = require('../models/Course');

const verifyCourseOwner = async (req, res, next) => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }

    console.log("📘 course.teacher =", course.teacher);
    console.log("👤 req.user._id =", req.user?._id);

     if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Lỗi xác thực chủ khóa học" });
    }
    next();
  } catch (err) {
    console.error("verifyCourseOwner error:", err);
    res.status(500).json({ error: "Lỗi xác thực chủ khóa học" });
  }
};

module.exports = verifyCourseOwner;
