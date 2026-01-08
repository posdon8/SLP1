const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const Course = require("../models/Course");

/**
 * =========================
 * PUBLIC – lấy category active (cho dashboard, filter)
 * =========================
 */
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải category",
      error: error.message
    });
  }
});

/**
 * =========================
 * ADMIN – lấy tất cả category
 * =========================
 */
router.get("/admin", authMiddleware, adminOnly, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải category",
      error: error.message
    });
  }
});

/**
 * =========================
 * ADMIN – tạo category
 * =========================
 */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tên category là bắt buộc"
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    const exists = await Category.findOne({ slug });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category đã tồn tại"
      });
    }

    const category = await Category.create({
      name,
      slug,
      description
    });

    res.status(201).json({
      success: true,
      data: category,
      message: "Tạo category thành công"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo category",
      error: error.message
    });
  }
});

/**
 * =========================
 * ADMIN – cập nhật category
 * =========================
 */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const updateData = {
      name,
      description,
      isActive
    };

    if (name) {
      updateData.slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy category"
      });
    }
    if (typeof isActive === "boolean") {
      // 1️⃣ Lấy tất cả course thuộc category vừa toggle
      const courses = await Course.find({ categories: category._id })
        .populate("categories", "isActive");

      for (const course of courses) {
        // 2️⃣ Kiểm tra xem còn category nào ON không
        const hasActiveCategory = course.categories.some(
          (cat) => cat.isActive === true
        );

        // 3️⃣ Quyết định hide / unhide
        course.isHidden = !hasActiveCategory;
        await course.save();
      }
    }
    res.json({
      success: true,
      data: category,
      message: "Cập nhật category thành công"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật category",
      error: error.message
    });
  }
});

/**
 * =========================
 * ADMIN – xóa category
 * (khuyến nghị: chỉ disable, không delete)
 * =========================
 */
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy category"
      });
    }

    res.json({
      success: true,
      message: "Xóa category thành công"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa category",
      error: error.message
    });
  }
});

module.exports = router;
