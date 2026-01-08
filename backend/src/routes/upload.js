// src/routes/upload.js
const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const { authMiddleware } = require("../middleware/auth");
const User = require("../models/User");
const { resizeAvatar } = require("../middleware/imageResize");

const API_URL = process.env.API_URL || "http://localhost:5000";

// ✅ POST upload video với error handling
router.post("/video", authMiddleware, (req, res) => {
  upload.single("video")(req, res, (err) => {
    try {
      console.log("🎥 Upload request received");
      console.log("📄 File info:", req.file);
      console.log("👤 User:", req.user?._id);
      
      if (err) {
        console.log("❌ Multer error:", err.message);
        return res.status(400).json({ 
          success: false, 
          message: err.message || "Lỗi upload file"
        });
      }

      if (!req.file) {
        console.log("❌ No file in request");
        return res.status(400).json({ 
          success: false, 
          message: "Không có file video" 
        });
      }

      console.log("✅ File saved:", req.file.filename);
      console.log("📁 File path:", req.file.path);

      const videoUrl = `${API_URL}/uploads/videos/${req.file.filename}`;
      
      console.log("🌐 Generated URL:", videoUrl);

      res.json({
        success: true,
        videoUrl: videoUrl,
        filename: req.file.filename,
        message: "Upload video thành công"
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi upload video"
      });
    }
  });
});

// ✅ POST upload file (tài liệu)
router.post("/file", authMiddleware, (req, res) => {
  upload.single("file")(req, res, (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Lỗi upload file"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file"
        });
      }

      const fileUrl = `${API_URL}/uploads/files/${req.file.filename}`;

      res.json({
        success: true,
        fileUrl: fileUrl,
        filename: req.file.filename,
        message: "Upload file thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi upload file"
      });
    }
  });
});

// ✅ POST upload image
router.post("/image", authMiddleware, (req, res) => {
  upload.single("image")(req, res, (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Lỗi upload ảnh"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file ảnh"
        });
      }

      const imageUrl = `${API_URL}/uploads/images/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl: imageUrl,
        filename: req.file.filename,
        message: "Upload ảnh thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi upload ảnh"
      });
    }
  });
});

// ✅ POST upload avatar + update user
router.post("/avatar", authMiddleware, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      console.log("📷 Avatar upload request");
      console.log("👤 User ID:", req.user._id);

      if (err) {
        console.error("❌ Upload error:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "Lỗi upload ảnh đại diện"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file ảnh"
        });
      }

      // ✅ Resize ảnh (200x200 cho avatar)
      const filePath = req.file.path;
      await resizeAvatar(filePath);
      console.log("✅ Avatar resized successfully");

      const avatarUrl = `${API_URL}/uploads/images/${req.file.filename}`;
      console.log("🌐 Avatar URL:", avatarUrl);

      // ✅ Cập nhật avatar URL vào database
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { avatarUrl: avatarUrl },
        { new: true }
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User không tìm thấy"
        });
      }

      console.log("✅ Avatar updated for user:", req.user._id);

      res.json({
        success: true,
        imageUrl: avatarUrl,
        filename: req.file.filename,
        user: updatedUser,
        message: "✅ Cập nhật ảnh đại diện thành công"
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi upload ảnh đại diện"
      });
    }
  });
});

// ✅ GET test endpoint
router.get("/test-upload", (req, res) => {
  res.json({
    success: true,
    message: "Upload endpoint hoạt động"
  });
});

module.exports = router;