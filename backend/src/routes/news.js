const express = require("express");
const router = express.Router();
const News = require("../models/News");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const optionalAuth = require("../middleware/optionalAuth");
const imageUploadDir = path.resolve(__dirname, "../../uploads/images");
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    console.log("✅ Image accepted:", file.originalname);
    cb(null, true);
  } else {
    console.log("❌ Invalid image type:", file.mimetype);
    cb(new Error("Chỉ chấp nhận ảnh (jpeg, png, webp)"), false);
  }
};

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// ========================================
// UPLOAD THUMBNAIL
// ========================================
router.post("/upload-thumbnail", authMiddleware, (req, res) => {
  imageUpload.single("thumbnail")(req, res, (err) => {
    try {
      if (err) {
        console.log("❌ Upload error:", err.message);
        return res.status(400).json({
          success: false,
          message: err.message || "Lỗi upload ảnh",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file ảnh",
        });
      }

      // ✅ FIX: Dynamic base URL from environment
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      const thumbnailUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

      console.log("✅ Image uploaded:", req.file.filename);

      res.json({
        success: true,
        thumbnailUrl: thumbnailUrl,
        filename: req.file.filename,
        message: "Upload ảnh thành công",
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi upload ảnh",
      });
    }
  });
});

// ========================================
// GET /news/admin/statistics - MUST be before /:id
// ========================================
router.get("/admin/statistics", authMiddleware, adminOnly, async (req, res) => {
  try {
    const total = await News.countDocuments();
    const published = await News.countDocuments({ status: "published" });
    const draft = await News.countDocuments({ status: "draft" });

    const byCategory = await News.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const mostViewed = await News.find()
      .sort({ views: -1 })
      .limit(5)
      .select("title views createdAt");

    res.json({
      success: true,
      data: {
        total,
        published,
        draft,
        byCategory,
        mostViewed,
      },
    });
  } catch (error) {
    console.error("❌ Statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
});

// ========================================
// GET / - Lấy tất cả tin tức (có phân trang và filter)
// ========================================
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { category, status, search } = req.query;

    let conditions = []; // ✅ gom tất cả điều kiện vào đây

    // =========================
    // 1️⃣ PHÂN QUYỀN THEO ROLE
    // =========================
    if (!req.user) {
      // Guest: chỉ xem published
      conditions.push({ status: "published" });
    } else if (req.user.roles?.includes("admin")) {
      // Admin: xem tất cả → không cần push gì
    } else if (req.user.roles?.includes("teacher")) {
      // Teacher: published + bài của mình
      conditions.push({
        $or: [
          { status: "published" },
          { author: req.user._id },
        ],
      });
    } else {
      // ✅ Student và các role khác: chỉ xem published
      conditions.push({ status: "published" });
    }
    // =========================
    // 2️⃣ FILTER THEO STATUS
    // =========================
    if (status) {
      conditions.push({ status });
    }

    // =========================
    // 3️⃣ FILTER THEO CATEGORY
    // =========================
    if (category) {
      conditions.push({ category });
    }

    // =========================
    // 4️⃣ SEARCH
    // =========================
    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ],
      });
    }

    // =========================
    // 5️⃣ BUILD FINAL QUERY
    // =========================
    const query = conditions.length > 0 ? { $and: conditions } : {};

    // =========================
    // 6️⃣ QUERY DATABASE
    // =========================
    const news = await News.find(query)
      .populate("author", "fullName email avatarUrl _id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: news,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải tin tức",
      error: error.message,
    });
  }
});


// ========================================
// GET /:id - Lấy chi tiết 1 tin tức
// ========================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate("author", "fullName email avatarUrl _id");

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tin tức",
      });
    }
  if (!req.user && news.status !== "published") {
        return res.status(401).json({
          success: false,
          message: "Vui lòng đăng nhập để xem nội dung này",
        });
      }
    // ✅ Kiểm tra quyền xem draft
    if (news.status === "draft") {
      // Cho phép admin hoặc chính tác giả xem
      const isAuthor = news.author._id.toString() === req.user._id.toString();
      if (!req.user.roles?.includes("admin") && !isAuthor) {
        return res.status(403).json({
          success: false,
          message: "Không có quyền xem tin tức này",
        });
      }
    }

    // Tăng lượt xem
    news.views += 1;
    await news.save();

    res.json({ success: true, data: news });
  } catch (error) {
    console.error("❌ Detail error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải tin tức",
      error: error.message,
    });
  }
});

// ========================================
// POST / - Tạo tin tức mới
// ========================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, thumbnail, status, tags } = req.body;
    
    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề là bắt buộc",
      });
    }
if (
  !req.user.roles.includes("teacher") &&
  !req.user.roles.includes("admin")
) {
  return res.status(403).json({
    success: false,
    message: "Chỉ giáo viên hoặc admin mới được tạo tin tức",
  });
}

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mô tả ngắn là bắt buộc",
      });
    }

    if (!thumbnail || !thumbnail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail là bắt buộc",
      });
    }

    // ✅ Teacher tạo tin mới → draft, Admin tạo → có thể chọn status
    let finalStatus = "draft";
    if (req.user.roles?.includes("admin") && status && ["draft", "published"].includes(status)) {
      finalStatus = status;
    }

    const news = new News({
      title: title.trim(),
      description: description.trim(),
      content: "",
      author: req.user._id,
      category: category?.trim() || "Tin tức",
      thumbnail: thumbnail.trim(),
      status: finalStatus,
      tags: Array.isArray(tags)
        ? tags.filter((t) => t && t.trim())
        : [],
    });

    await news.save();

    const populatedNews = await News.findById(news._id)
      .populate("author", "fullName email avatarUrl _id");

    res.status(201).json({
      success: true,
      data: populatedNews,
      message: "Tạo tin tức thành công",
    });
  } catch (error) {
    console.error("❌ Create error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi tạo tin tức",
      error: error.message,
    });
  }
});

// ========================================
// PUT /:id - Cập nhật tin tức
// ========================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, content, category, thumbnail, status, tags } = req.body;

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tin tức",
      });
    }

    // ✅ Authorization: Teacher chỉ sửa tin của mình, Admin sửa tất cả
    const isAuthor = news.author.toString() === req.user._id.toString();
    if (req.user.roles?.includes("teacher" ) && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể chỉnh sửa tin tức của mình",
      });
    }

    // ✅ Build update data (trim all strings)
    let updateData = {};
    if (title && title.trim()) updateData.title = title.trim();
    if (description && description.trim()) updateData.description = description.trim();
    if (content !== undefined) updateData.content = content;
    if (category && category.trim()) updateData.category = category.trim();
    if (thumbnail && thumbnail.trim()) updateData.thumbnail = thumbnail.trim();
    if (Array.isArray(tags)) {
      updateData.tags = tags.filter((t) => t && t.trim());
    }

    // ✅ Chỉ Admin mới có quyền cập nhật status
    if (req.user.roles?.includes("admin") && status && ["draft", "published"].includes(status)) {
      updateData.status = status;
    }

    const updatedNews = await News.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "fullName email avatarUrl _id");

    res.json({
      success: true,
      data: updatedNews,
      message: "Cập nhật tin tức thành công",
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(400).json({
      success: false,
      message: "Lỗi khi cập nhật tin tức",
      error: error.message,
    });
  }
});

// ========================================
// PUT /content/:id - Cập nhật nội dung tin tức
// ========================================
router.put("/content/:id", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nội dung không được để trống",
      });
    }

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tin tức",
      });
    }

    // ✅ Authorization: Teacher chỉ sửa nội dung tin của mình
    const isAuthor = news.author.toString() === req.user._id.toString();
    if (req.user.roles?.includes("teacher")  && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể chỉnh sửa nội dung tin tức của mình",
      });
    }

    news.content = content;
    await news.save();

    const populatedNews = await News.findById(news._id)
      .populate("author", "fullName email avatarUrl _id");

    res.json({
      success: true,
      data: populatedNews,
      message: "Cập nhật nội dung tin tức thành công",
    });
  } catch (error) {
    console.error("❌ Content update error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật nội dung",
      error: error.message,
    });
  }
});

// ========================================
// DELETE /:id - Xóa tin tức
// ========================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tin tức",
      });
    }

    // ✅ Authorization: Admin hoặc chính tác giả
    const isAuthor = news.author.toString() === req.user._id.toString();
    const isAdmin = req.user.roles?.includes("admin");

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể xóa tin tức của mình",
      });
    }

    await News.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Xóa tin tức thành công",
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tin tức",
      error: error.message,
    });
  }
});

module.exports = router;