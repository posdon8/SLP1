const express = require("express");
const Course = require("../models/Course");
const { verifyTeacher } = require("../middleware/auth");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const verifyCourseOwner = require("../middleware/courseOwner");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const NotificationService = require("../services/notificationService");
const Category = require("../models/Category")
const { updateTeacherAverageRating } = require("../services/teacherRating");
// ========================================
// 1️⃣ ROUTES KHÔNG CÓ THAM SỐ
// ========================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, categories, price, isFree, accessType, thumbnail } = req.body;
    const userId = req.user._id;

    console.log("📝 Creating course:", {
      userId,
      title,
      currentRoles: req.user.roles
    });

    // 1️⃣ Get user with full data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    console.log("👤 User found:", {
      username: user.username,
      roles: user.roles
    });

    // 2️⃣ Check if user already has teacher role
    const isAlreadyTeacher = user.roles && user.roles.includes("teacher");
    let becameTeacher = false;

    // 3️⃣ If not teacher yet, upgrade them
    if (!isAlreadyTeacher) {
      console.log("⬆️ Upgrading user to teacher...");
      
      user.roles = user.roles || [];
      if (!user.roles.includes("teacher")) {
        user.roles.push("teacher");
      }
      user.isInstructor = true;
      await user.save();
      
      becameTeacher = true;
      console.log("✅ User upgraded to teacher:", {
        username: user.username,
        newRoles: user.roles
      });
    }

    // 4️⃣ Create the course
    const finalPrice = isFree || accessType === "private" ? 0 : price;

    const newCourse = new Course({
      title,
      description,
      categories,
      teacher: userId,
      price: finalPrice,
      isFree: isFree || accessType === "private",
      accessType,
      thumbnail,
      approvalStatus: "pending"
    });

    // Set default settings for private courses
    if (accessType === "private") {
      newCourse.codeDisabled = false;
      newCourse.enrollmentMode = "auto";
       newCourse.enrollmentCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
    }
    
    await newCourse.save();
    console.log("✅ Course created:", {
      courseId: newCourse._id,
      title: newCourse.title,
      teacher: newCourse.teacher
    });

    // 5️⃣ Populate teacher info before sending response
    await newCourse.populate("teacher", "fullName email username");
    await newCourse.populate("categories", "name");

    res.status(201).json({
      success: true,
      message: becameTeacher 
        ? "🎉 Congratulations! You are now a teacher and your course has been created!"
        : "✅ Course created successfully!",
      course: newCourse,
      becameTeacher  // Frontend uses this to update UI
    });
  } catch (err) {
    console.error("❌ Error creating course:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to create course",
      message: err.message 
    });
  }
});
router.post(
  "/search-by-code",
  authMiddleware,
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã code",
        });
      }

      const course = await Course.findOne({
        enrollmentCode: code.toUpperCase(),
      }).populate("teacher", "fullName");

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khóa học",
        });
      }

      // ❗ KHÔNG check public/private ở đây
      // Vì có code nghĩa là có quyền xem info

      res.json({
        success: true,
        course,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);


router.get("/admin/pending", authMiddleware, adminOnly, async (req, res) => {
  const courses = await Course.find({ approvalStatus: "pending" })
    .populate("teacher", "fullName email")
    .populate("categories", "name");

  res.json(courses);
});

router.put("/admin/:id/approve", authMiddleware, adminOnly, async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Không tìm thấy course" });

  course.approvalStatus = "approved";
  course.adminReview = {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
    note: "Approved"
  };

  await course.save();
  res.json({ message: "✅ Khóa học đã được duyệt" });
});

router.put("/admin/:id/reject", authMiddleware, adminOnly, async (req, res) => {
  const { reason } = req.body;

  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Không tìm thấy course" });

  course.approvalStatus = "rejected";
  course.adminReview = {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
    note: reason || "Không đạt yêu cầu"
  };

  await course.save();
  res.json({ message: "❌ Khóa học đã bị từ chối" });
});

router.put("/:id/resubmit", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ❌ Không phải chủ course
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // ❌ Chỉ resubmit khi bị reject
    if (course.approvalStatus !== "rejected") {
      return res.status(400).json({
        message: "Only rejected courses can be resubmitted"
      });
    }

    course.approvalStatus = "pending";
    course.adminReview = null;
    course.resubmittedAt = new Date();

    await course.save();

    res.json({
      success: true,
      message: "Course resubmitted successfully",
      course
    });
  } catch (err) {
    console.error("❌ Resubmit error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/filter", async (req, res) => {
  try {
    const { category } = req.query;

    let query = {
      accessType: "public",
      approvalStatus: "approved",
      isHidden: false
    };

    if (category && category !== "all") {
      const cat = await Category.findOne({
        slug: category,
        isActive: true
      }).select("_id");

      if (cat) {
        query.categories = cat._id;
      }
    }

    const courses = await Course.find(query)
      .populate("teacher", "fullName roles")
      .populate("categories", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    const categories = await Category.find({ isActive: true })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      courses,
      categories,
      total: courses.length
    });

  } catch (err) {
    console.error("❌ Filter error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi lọc khóa học"
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { categorySlug } = req.query;
    const query = { approvalStatus: "approved", accessType: "public", isHidden: false };

    if (categorySlug && categorySlug !== "all") {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        query.categories = { $in: [category._id] };
      }
    }

    const courses = await Course.find(query)
      .populate("teacher", "fullName")
      .populate("categories", "name slug");

    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categoryIds = await Course.distinct("categories", {
      accessType: "public",
      isHidden: false,
      approvalStatus: "approved"
    });

    const categories = await Category.find({
      _id: { $in: categoryIds },
      isActive: true
    }).select("_id name slug");

    res.json({
      success: true,
      categories
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Không lấy được danh sách category",
    });
  }
});

// ========================================
// 2️⃣ ROUTES NAMED - SPECIFIC
// ========================================

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ courses: [] });
    }

    const courses = await Course.find({
      approvalStatus: "approved",
      accessType: "public",
      isHidden: false,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ],
    })
      .populate("teacher", "fullName name")
      .limit(10)
      .sort({ totalStudents: -1 });

    res.json({ courses });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/my-courses", verifyTeacher, async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id })
      .populate("categories", "name")
      .sort({ createdAt: -1 });

    // ✅ Return object, not array
    res.json({
      success: true,
      courses: courses  // Array inside object
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

router.get("/my-enrolled-courses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "enrolledCourses",
      populate: { path: "teacher", select: "fullName roles" }
    });

    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

    res.json({ success: true, courses: user.enrolledCourses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ========================================
// 3️⃣ ROUTES VỚI :id - ACTION ROUTES TRƯỚC
// ========================================

router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!course || !user)
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học hoặc người dùng" });
    
    if (course.isHidden) {
      return res.status(403).json({
        success: false,
        message: "Khóa học hiện không khả dụng"
      });
    }

    if (course.accessType === "private") {
      return res.status(403).json({
        success: false,
        message: "🔒 Khóa học riêng tư, vui lòng tham gia bằng mã code"
      });
    }
    if (!course.isFree)
      return res.status(403).json({ success: false, message: "Khóa học trả phí, cần thanh toán" });

    const alreadyJoined = course.students.map(s => s.toString()).includes(user._id.toString());

    if (alreadyJoined)
      return res.status(400).json({ success: false, message: "Bạn đã tham gia khóa học" });

    await NotificationService.notifyStudentJoined(
      course._id,
      user._id,
      course.teacher._id,
      course.title,
      user.fullName
    );

    course.students.push(user._id);
    course.totalStudents = course.students.length;
    await course.save();

    if (!user.enrolledCourses.map(c => c.toString()).includes(course._id.toString())) {
      user.enrolledCourses.push(course._id);
      await user.save();
    }

    const courseObj = course.toObject();
    courseObj.joined = true;

    res.json({ success: true, message: "✅ Tham gia khóa học thành công", course: courseObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.put("/:id/hidden",
  authMiddleware,
  verifyTeacher,
  verifyCourseOwner,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        { $set: { isHidden: !course.isHidden } },
        {
          new: true,
          runValidators: false, // 🔥 QUAN TRỌNG
        }
      );

       res.json({
        success: true,
        isHidden: updatedCourse.isHidden,
        message: updatedCourse.isHidden
          ? "🙈 Khóa học đã bị ẩn"
          : "👁️ Khóa học đã được hiển thị lại",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.delete("/:id",
  authMiddleware,
  verifyTeacher,
  verifyCourseOwner,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      await course.deleteOne();

      res.json({
        success: true,
        message: "🗑️ Đã xóa khóa học vĩnh viễn",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail, category, price, isFree } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khóa học",
      });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa khóa học này",
      });
    }

    if (title) course.title = title;
    if (description) course.description = description;
    if (thumbnail) course.thumbnail = thumbnail;
    if (category) course.category = category;
    if (isFree !== undefined) {
      course.isFree = isFree;
      if (isFree) course.price = 0;
      else if (price) course.price = price;
    } else if (price) {
      course.price = price;
    }

    await course.save();
    const updatedCourse = await course.populate("teacher", "_id fullName roles");

    res.json({
      success: true,
      message: "✅ Cập nhật khóa học thành công",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
});

router.post("/:id/join-by-code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }

    const course = await Course.findOne({
  _id: req.params.id,
  enrollmentCode: code
});


    if (!course) {
      return res.status(400).json({ success: false, message: "❌ Mã code không hợp lệ" });
    }

    if (course.codeDisabled) {
      return res.status(403).json({ success: false, message: "❌ Code này đã bị vô hiệu hóa" });
    }

    const alreadyJoined = course.students.map(s => s.toString()).includes(user._id.toString());
    const alreadyPending = course.pendingStudents.some(p => p.studentId.toString() === user._id.toString());

    if (alreadyJoined) {
      return res.status(400).json({ success: false, message: "❌ Bạn đã tham gia khóa học này" });
    }

    if (alreadyPending) {
      return res.status(400).json({ success: false, message: "❌ Bạn đã gửi yêu cầu tham gia khóa học này" });
    }

    if (course.enrollmentMode === "auto") {
      course.students.push(user._id);
      course.totalStudents = course.students.length;
      await course.save();

      if (!user.enrolledCourses.map(c => c.toString()).includes(course._id.toString())) {
        user.enrolledCourses.push(course._id);
        await user.save();
      }

      await NotificationService.notifyStudentJoined(
        course._id,
        user._id,
        course.teacher._id,
        course.title,
        user.fullName
      );

      return res.json({
        success: true,
        message: "✅ Bạn đã tham gia khóa học thành công!",
        course: course.toObject()
      });
    }

    if (course.enrollmentMode === "manual") {
      course.pendingStudents.push({
        studentId: user._id,
        studentName: user.fullName,
        studentEmail: user.email,
        requestedAt: new Date(),
        status: "pending"
      });
      await course.save();

      await NotificationService.notifyPendingApproval(
        course._id,
        user._id,
        course.teacher._id,
        course.title,
        user.fullName
      );

      return res.json({
        success: true,
        message: "⏳ Yêu cầu tham gia đã được gửi. Vui lòng chờ giáo viên duyệt!",
        course: course.toObject()
      });
    }
  } catch (err) {
    console.error("Join by code error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ========================================
// TEACHER: Quản lý danh sách chờ duyệt
// ========================================

router.get("/:id/pending-students", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: "pendingStudents.studentId",
        select: "_id fullName email"
      });

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    res.json({
      success: true,
      pendingStudents: course.pendingStudents || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.put("/:id/pending-students/:studentId/approve", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    const pendingIndex = course.pendingStudents.findIndex(
      p => p.studentId.toString() === studentId
    );

    if (pendingIndex === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
    }

    const pendingStudent = course.pendingStudents[pendingIndex];
    
    const alreadyJoined = course.students.map(s => s.toString()).includes(studentId);
    if (!alreadyJoined) {
      course.students.push(studentId);
    }

    pendingStudent.status = "approved";
    course.pendingStudents.splice(pendingIndex, 1);
    course.totalStudents = course.students.length;
    await course.save();

    const user = await User.findById(studentId);
    if (user && !user.enrolledCourses.map(c => c.toString()).includes(course._id.toString())) {
      user.enrolledCourses.push(course._id);
      await user.save();
    }

    await NotificationService.notifyApprovalAccepted(
      course._id,
      studentId,
      course.teacher._id,
      course.title
    );

    res.json({
      success: true,
      message: `✅ Đã duyệt ${pendingStudent.studentName}`,
      course: course.toObject()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.put("/:id/pending-students/:studentId/reject", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    const pendingIndex = course.pendingStudents.findIndex(
      p => p.studentId.toString() === studentId
    );

    if (pendingIndex === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
    }

    const rejectedStudent = course.pendingStudents[pendingIndex];
    rejectedStudent.status = "rejected";
    course.pendingStudents.splice(pendingIndex, 1);
    await course.save();

    await NotificationService.notifyApprovalRejected(
      course._id,
      studentId,
      course.teacher._id,
      course.title
    );

    res.json({
      success: true,
      message: `❌ Đã từ chối ${rejectedStudent.studentName}`,
      course: course.toObject()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ========================================
// TEACHER: Quản lý enrollment mode & code
// ========================================

router.put("/:id/enrollment-mode", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { enrollmentMode } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    if (!["auto", "manual"].includes(enrollmentMode)) {
      return res.status(400).json({ success: false, message: "Chế độ không hợp lệ" });
    }

    course.enrollmentMode = enrollmentMode;
    await course.save();

    const modeText = enrollmentMode === "auto" ? "Tự động (Auto)" : "Duyệt (Manual)";

    res.json({
      success: true,
      message: `✅ Đã thay đổi chế độ thành: ${modeText}`,
      course: course.toObject()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.put("/:id/regenerate-code", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    const newCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    course.enrollmentCode = newCode;
    course.codeDisabled = false;
    await course.save();

    res.json({
      success: true,
      message: `✅ Mã code mới: ${newCode}`,
      enrollmentCode: newCode,
      course: course.toObject()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.put("/:id/disable-code", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    course.codeDisabled = !course.codeDisabled;
    await course.save();

    const status = course.codeDisabled ? "Đã vô hiệu hóa" : "Đã kích hoạt";

    res.json({
      success: true,
      message: `✅ Code ${status}`,
      codeDisabled: course.codeDisabled,
      course: course.toObject()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// GET /:id - GENERIC ROUTE
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Course ID không hợp lệ"
      });
    }

    const course = await Course.findById(req.params.id)
      .populate("teacher", "_id fullName roles")
      .populate("students", "_id fullName email");

    if (!course) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }

    // ✅ Define các biến cần thiết
    const isOwner = course.teacher?._id?.equals(req.user._id);
    const isAdmin = req.user.roles?.includes('admin');
    const isStudentEnrolled = course.students.some(s => s._id.toString() === req.user._id.toString());
    const isTeacher = req.user.roles?.includes('teacher');

    // ✅ Kiểm tra course bị ẩn
    if (course.isHidden && !isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Khóa học hiện đang bị ẩn",
      });
    }

    // ✅ Kiểm tra course private
    if (course.accessType === "private" && !isOwner && !isAdmin && !isStudentEnrolled) {
      return res.status(403).json({
        error: "🔒 Khóa học riêu tư",
      });
    }

    // ✅ Chỉ hiển thị danh sách students nếu là teacher chủ sở hữu hoặc admin
    const students = (isTeacher && !isOwner && !isAdmin) ? [] : course.students;

    res.json({
      ...course.toObject(),
      editable: isTeacher && isOwner,
      students,
      joined: isStudentEnrolled,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ========================================
// 4️⃣ ROUTES VỚI :courseId (khác tham số)
// ========================================

router.post("/:courseId/add-section", authMiddleware, verifyTeacher, verifyCourseOwner, async (req, res) => {
  try {
    const { title } = req.body;
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    const newSection = { title, lessons: [] };
    course.sections.push(newSection);
    await course.save();

    res.json({ message: "Section added successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:courseId/sections/:sectionId", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    course.sections = course.sections.filter(
      (s) => s._id.toString() !== sectionId
    );
    await course.save();

    res.json({ message: "Section deleted successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:courseId/sections/:sectionId", authMiddleware, verifyTeacher, verifyCourseOwner, async (req, res) => {
  try {
    const { title } = req.body;
    const { courseId, sectionId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ error: "Section not found" });

    section.title = title;
    await course.save();

    res.json({ message: "Section updated successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ⭐ POST - ADD LESSON (CẬP NHẬT)
router.post("/:courseId/sections/:sectionId/lessons", authMiddleware, verifyTeacher, verifyCourseOwner, async (req, res) => {
  try {
    const { title, type, videoUrl, fileUrl, fileName, fileType, quizId, duration } = req.body;
    const { courseId, sectionId } = req.params;
    const user = await User.findById(req.user._id);
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ error: "Section not found" });

    // Validate
    if (!title || !type) {
      return res.status(400).json({ error: "Cần có title và type" });
    }

    if ((type === "video") && !videoUrl) {
      return res.status(400).json({ error: "Video lesson cần videoUrl" });
    }

    if ((type === "file") && !fileUrl) {
      return res.status(400).json({ error: "File lesson cần fileUrl" });
    }

    if ((type === "quiz") && !quizId) {
      return res.status(400).json({ error: "Quiz lesson cần quizId" });
    }

    const newLesson = {
      title,
      type,
      duration: duration || 0
    };

    // Thêm dữ liệu theo type
    if (type === "video") {
      newLesson.videoUrl = videoUrl;
    } else if (type === "file") {
      newLesson.fileUrl = fileUrl;
      newLesson.fileName = fileName;
      newLesson.fileType = fileType;
    } else if (type === "quiz") {
      newLesson.quizId = quizId;
    }

    section.lessons.push(newLesson);
    await course.save();

    await NotificationService.notifyNewLesson(
      course._id,
      title,
      course.students,
      course.title,
      user._id,
      user.fullName
    );

    const addedLesson = section.lessons.slice(-1)[0];

    res.json({
      message: "Lesson added successfully",
      course,
      addedLesson,
    });
  } catch (error) {
    console.error("Add lesson error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ⭐ PUT - UPDATE LESSON (CẬP NHẬT)
router.put("/:courseId/lessons/:lessonId", authMiddleware, verifyTeacher, verifyCourseOwner, async (req, res) => {
  try {
    const { title, type, videoUrl, fileUrl, fileName, fileType, quizId, duration } = req.body;
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    let lessonFound = false;
    course.sections.forEach((section) => {
      const lesson = section.lessons.id(lessonId);
      if (lesson) {
        lesson.title = title || lesson.title;
        lesson.type = type || lesson.type;
        
        if (type) {
          // Xóa các field cũ khi đổi type
          lesson.videoUrl = undefined;
          lesson.fileUrl = undefined;
          lesson.fileName = undefined;
          lesson.fileType = undefined;
          lesson.quizId = undefined;

          // Thêm field mới theo type
          if (type === "video") {
            lesson.videoUrl = videoUrl || lesson.videoUrl;
          } else if (type === "file") {
            lesson.fileUrl = fileUrl || lesson.fileUrl;
            lesson.fileName = fileName || lesson.fileName;
            lesson.fileType = fileType || lesson.fileType;
          } else if (type === "quiz") {
            lesson.quizId = quizId || lesson.quizId;
          }
        }
        
        if (type !== "quiz" && duration !== undefined) {
          lesson.duration = duration;
        }
        
        lessonFound = true;
      }
    });

    if (!lessonFound) return res.status(404).json({ error: "Lesson not found" });

    await course.save();
    res.json({ message: "Lesson updated successfully", course });
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:courseId/lessons/:lessonId
router.delete("/:courseId/lessons/:lessonId", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    let lessonDeleted = false;
    course.sections.forEach((section) => {
      const initialCount = section.lessons.length;
      section.lessons = section.lessons.filter(
        (lesson) => lesson._id.toString() !== lessonId
      );
      if (section.lessons.length < initialCount) lessonDeleted = true;
    });

    if (!lessonDeleted) return res.status(404).json({ error: "Lesson not found" });

    await course.save();
    res.json({ message: "Lesson deleted successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:courseId/resources
router.get("/:courseId/resources", async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({
      success: true,
      resources: course.resources || [],
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Không thể lấy danh sách tài nguyên!" });
  }
});

// POST /:courseId/add-resource
router.post("/:courseId/add-resource", authMiddleware, async (req, res) => {
  try {
    const { name, url, type } = req.body;
    const course = await Course.findById(req.params.courseId);
    const user = await User.findById(req.user._id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khóa học" });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền thêm tài liệu" });
    }

    course.resources.push({ name, url, type });
    await course.save();

    await NotificationService.notifyNewResource(
      course._id,
      name,
      course.students,
      course.title,
      user._id,
      user.fullName
    );

    res.json({ success: true, message: "Thêm tài liệu thành công", course });
  } catch (error) {
    console.error("Lỗi thêm tài liệu:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi thêm tài liệu",
    });
  }
});

// DELETE /:courseId/resources/:resourceId
router.delete("/:courseId/resources/:resourceId", authMiddleware, verifyTeacher, verifyCourseOwner, async (req, res) => {
  try {
    const { courseId, resourceId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    course.resources = course.resources.filter(
      (r) => r._id.toString() !== resourceId
    );

    await course.save();

    res.json({ message: "Resource deleted successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:courseId/reviews
router.get("/:courseId/reviews", async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    res.json({ success: true, reviews: course.reviews || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:courseId/reviews
// POST /:courseId/reviews - UPDATED
router.post("/:courseId/reviews", async (req, res) => {
  try {
    const { user, stars, comment, userId } = req.body;
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    // ⭐ Kiểm tra user đã review chưa
    const existingReview = course.reviews.find(
      r => r.userId?.toString() === userId
    );

    if (existingReview) {
      return res.status(400).json({
        error: "Bạn đã đánh giá khóa học này rồi. Mỗi học viên chỉ được đánh giá 1 lần."
      });
    }

    // Thêm review mới
    course.reviews.push({ 
      userId,  // Lưu userId
      user, 
      stars, 
      comment,
      createdAt: new Date()
    });
    
    await course.save();
    await updateTeacherAverageRating(course.teacher);
    
    res.status(201).json({ 
      message: "Review added successfully", 
      reviews: course.reviews 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:courseId/reviews/:reviewId - UPDATED
router.put("/:courseId/reviews/:reviewId", async (req, res) => {
  try {
    const { stars, comment, userId } = req.body;
    const { courseId, reviewId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const review = course.reviews.id(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    // ⭐ Kiểm tra xem chỉ owner mới được update
    if (review.userId?.toString() !== userId) {
      return res.status(403).json({ error: "Không có quyền sửa đánh giá này" });
    }

    review.stars = stars || review.stars;
    review.comment = comment || review.comment;

    await course.save();
    res.json({ message: "Review updated successfully", reviews: course.reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:courseId/reviews/:reviewId - UPDATED
router.delete("/:courseId/reviews/:reviewId", async (req, res) => {
  try {
    const { courseId, reviewId } = req.params;
    const userId = req.body.userId; // Lấy userId từ body

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const review = course.reviews.id(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    // ⭐ Kiểm tra xem chỉ owner mới được xóa
    if (review.userId?.toString() !== userId) {
      return res.status(403).json({ error: "Không có quyền xóa đánh giá này" });
    }

    course.reviews = course.reviews.filter(r => r._id.toString() !== reviewId);
    await course.save();
    
    res.json({ message: "Review deleted successfully", reviews: course.reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:courseId/kick-student
router.post("/:courseId/kick-student", authMiddleware, verifyCourseOwner, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp ID học viên",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khóa học",
      });
    }

    course.students = course.students.filter(
      (s) => s._id.toString() !== studentId
    );
    course.totalStudents = course.students.length;
    await course.save();

    const user = await User.findById(studentId);
    if (user) {
      user.enrolledCourses = user.enrolledCourses.filter(
        (c) => c.toString() !== courseId
      );
      await user.save();
    }

    res.json({
      success: true,
      message: "✅ Đã kick học viên ra khỏi khóa học",
      course,
    });
  } catch (error) {
    console.error("Kick student error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
});

module.exports = router;