// src/config/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Lưu vào backend/uploads/videos (không phải src/uploads)
const backendRoot = path.resolve(__dirname, "../../");
const uploadDir = path.join(backendRoot, "uploads", "videos");

console.log("🔍 Backend root:", backendRoot);
console.log("📁 Upload dir:", uploadDir);

// Tạo thư mục nếu chưa có
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created directory:", uploadDir);
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subFolder = "others";

    if (file.mimetype.startsWith("image/")) {
      subFolder = "images";
    } else if (file.mimetype.startsWith("video/")) {
      subFolder = "videos";
    } else {
      subFolder = "files";
    }

    const dynamicDir = path.join(backendRoot, "uploads", subFolder);

    if (!fs.existsSync(dynamicDir)) {
      fs.mkdirSync(dynamicDir, { recursive: true });
    }

    console.log("💾 Saving to:", dynamicDir);
    cb(null, dynamicDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${path.extname(file.originalname)}`;

    console.log("📝 Filename:", uniqueName);
    cb(null, uniqueName);
  }
});


// Filter chỉ chấp nhận video
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp"
    ];
  if (allowedMimes.includes(file.mimetype)) {
    console.log("✅ Video accepted:", file.originalname);
    cb(null, true);
  } else {
    console.log("❌ Invalid mime type:", file.mimetype);
    cb(new Error(`Chỉ chấp nhận video (${allowedMimes.join(", ")})`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB
  }
});

module.exports = upload;