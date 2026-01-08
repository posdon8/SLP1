const Course = require("../models/Course");
const User = require("../models/User");

async function updateTeacherAverageRating(teacherId) {
  const courses = await Course.find({
    teacher: teacherId,
    rating: { $gt: 0 }
  });

  if (courses.length === 0) {
    await User.findByIdAndUpdate(teacherId, {
      "teacherStats.averageRating": 0,
      "teacherStats.updatedAt": new Date()
    });
    return;
  }

  const total = courses.reduce((sum, c) => sum + c.rating, 0);
  const avg = parseFloat((total / courses.length).toFixed(2));

  await User.findByIdAndUpdate(teacherId, {
    "teacherStats.averageRating": avg,
    "teacherStats.updatedAt": new Date()
  });
}

module.exports = { updateTeacherAverageRating };
