// src/middleware/imageResize.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// ✅ Resize ảnh avatar (200x200) - Using Buffer
const resizeAvatar = async (filePath) => {
  try {
    console.log("🔄 Resizing avatar:", filePath);

    // ✅ Đọc file vào buffer
    const imageBuffer = await fs.readFile(filePath);
    
    // ✅ Resize trong memory
    const resizedBuffer = await sharp(imageBuffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // ✅ Ghi buffer ra file (overwrite)
    await fs.writeFile(filePath, resizedBuffer);

    console.log("✅ Avatar resized successfully");
    return true;
  } catch (error) {
    console.error("⚠️ Image resize warning:", error.message);
    // Không throw error - tiếp tục dù resize thất bại
    // Ảnh original vẫn được lưu và hiển thị
    return true;
  }
};

// ✅ Resize ảnh general (1024x1024)
const resizeImage = async (filePath, width = 1024, height = 1024) => {
  try {
    const imageBuffer = await fs.readFile(filePath);
    
    const resizedBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    await fs.writeFile(filePath, resizedBuffer);

    console.log(`✅ Image resized to ${width}x${height}`);
    return true;
  } catch (error) {
    console.error("⚠️ Image resize warning:", error.message);
    return true;
  }
};

module.exports = { resizeAvatar, resizeImage };