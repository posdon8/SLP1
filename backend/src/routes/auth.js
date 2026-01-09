const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { model } = require("mongoose");
const router = express.Router();
const nodemailer = require("nodemailer");
const  { OAuth2Client } = require("google-auth-library");
const JWT_SECRET = process.env.JWT_SECRET || "posei"; 
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { authMiddleware } = require("../middleware/auth");

const verificationCodes = new Map();

/* ⭐ Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // example@gmail.com
    pass: process.env.EMAIL_PASSWORD  // app password
  }
}); */
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",  // ⭐ Exact text, không phải email!
    pass: process.env.SENDGRID_API_KEY
  }
});
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
router.post("/send-verification-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email là bắt buộc" });
    }

    // ⭐ Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email này đã được đăng ký" });
    }

    // ⭐ Generate code
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

    // ⭐ Lưu code
    verificationCodes.set(email, { code, expiresAt });

    // ⭐ Gửi email
    await transporter.sendMail({
      from: "noreply@slp.com",
      to: email,
      subject: "Mã xác thực SLP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Xác thực email của bạn</h2>
          <p>Mã xác thực của bạn là:</p>
          <h1 style="color: #667eea; letter-spacing: 5px; text-align: center;">${code}</h1>
          <p>Mã này sẽ hết hạn trong 10 phút</p>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
          </p>
        </div>
      `
    });

    console.log(`✅ Sent verification code to ${email}`);

    res.json({ 
      success: true, 
      message: "Mã xác thực đã được gửi đến email của bạn" 
    });

  } catch (error) {
    console.error("❌ Send code error:", error);
    res.status(500).json({ error: "Lỗi gửi email" });
  }
});

// ============================================
// ✅ POST /verify-code
// ============================================
router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email và mã là bắt buộc" });
    }

    // ⭐ Kiểm tra code có tồn tại
    const stored = verificationCodes.get(email);
    if (!stored) {
      return res.status(400).json({ error: "Mã xác thực không hợp lệ hoặc đã hết hạn" });
    }

    // ⭐ Kiểm tra hết hạn
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: "Mã xác thực đã hết hạn" });
    }

    // ⭐ Kiểm tra code
    if (stored.code !== code) {
      return res.status(400).json({ error: "Mã xác thực không đúng" });
    }

    // ⭐ Xóa code sau khi dùng
    verificationCodes.delete(email);

    res.json({ 
      success: true, 
      message: "Email được xác thực thành công" 
    });

  } catch (error) {
    console.error("❌ Verify code error:", error);
    res.status(500).json({ error: "Lỗi xác thực" });
  }
});

// ============================================
// 📝 POST /register (Updated)
// ============================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName, roles } = req.body;

    // ⭐ Validate
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    // ⭐ Kiểm tra email đã tồn tại
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email này đã được đăng ký" });
    }

    // ⭐ Kiểm tra username đã tồn tại
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: "Username này đã tồn tại" });
    }

    // ⭐ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ⭐ Tạo user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      roles: ["student"]  // ⭐ Mặc định là student
    });

    await user.save();

    res.json({
      success: true,
      message: "Đăng ký thành công!",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ error: error.message });
  }
});
const resetCodes = new Map();

// ============================================
// 📧 POST /send-reset-code
// ============================================
router.post("/send-reset-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email là bắt buộc" });
    }

    // ⭐ Kiểm tra email có tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email này không được đăng ký" });
    }

    // ⭐ Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

    // ⭐ Lưu reset code
    resetCodes.set(email, { code, expiresAt });

    // ⭐ Gửi email
    await transporter.sendMail({
      from: "noreply@slp.com",
      to: email,
      subject: "Mã đặt lại mật khẩu Udemy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>🔐 Đặt lại mật khẩu</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác thực của bạn là:</p>
          <h1 style="color: #667eea; letter-spacing: 5px; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px;">${code}</h1>
          <p>Mã này sẽ hết hạn trong 10 phút</p>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
        </div>
      `
    });

    console.log(`✅ Sent reset code to ${email}`);

    res.json({ 
      success: true, 
      message: "Mã đặt lại mật khẩu đã được gửi đến email của bạn" 
    });

  } catch (error) {
    console.error("❌ Send reset code error:", error);
    res.status(500).json({ error: "Lỗi gửi email" });
  }
});

// ============================================
// ✅ POST /verify-reset-code
// ============================================
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email và mã là bắt buộc" });
    }

    // ⭐ Kiểm tra code
    const stored = resetCodes.get(email);
    if (!stored) {
      return res.status(400).json({ error: "Mã xác thực không hợp lệ hoặc đã hết hạn" });
    }

    // ⭐ Kiểm tra hết hạn
    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ error: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới" });
    }

    // ⭐ Kiểm tra code chính xác
    if (stored.code !== code) {
      return res.status(400).json({ error: "Mã xác thực không đúng" });
    }

    res.json({ 
      success: true, 
      message: "Mã xác thực chính xác" 
    });

  } catch (error) {
    console.error("❌ Verify reset code error:", error);
    res.status(500).json({ error: "Lỗi xác thực" });
  }
});

// ============================================
// 🔄 POST /reset-password
// ============================================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    // ⭐ Kiểm tra email tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email không tồn tại" });
    }

    // ⭐ Kiểm tra code còn valid
    const stored = resetCodes.get(email);
    if (!stored) {
      return res.status(400).json({ error: "Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại" });
    }

    // ⭐ Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ⭐ Cập nhật password
    user.password = hashedPassword;
    await user.save();

    // ⭐ Xóa reset code
    resetCodes.delete(email);

    // ⭐ Gửi email xác nhận
    await transporter.sendMail({
      from: "noreply@slp.com",
      to: email,
      subject: " Mật khẩu đã được đặt lại thành công",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2> Mật khẩu đã được đặt lại</h2>
          <p>Mật khẩu của bạn đã được thay đổi thành công.</p>
          <p>Nếu bạn không thực hiện thao tác này, vui lòng liên hệ với chúng tôi ngay.</p>
          <p style="margin-top: 20px; color: #999; font-size: 12px;">
            Đây là email tự động, vui lòng không trả lời.
          </p>
        </div>
      `
    });

    console.log(`✅ Password reset for ${email}`);

    res.json({ 
      success: true, 
      message: "Đặt lại mật khẩu thành công!" 
    });

  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 POST /change-password (Cho user đã login)
// ============================================
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ mật khẩu" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    // ⭐ Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    // ⭐ Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    }

    // ⭐ Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: "Đổi mật khẩu thành công!" 
    });

  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ error: error.message });
  }
});

//login
router.post("/login", async (req, res) => {
    try {
    const { username, password } = req.body;

    const user = await User.findOne({
  $or: [{ username }, { email: username }]
})
;
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ message: "Login successful", token, user: {
        _id: user._id,
        name: user.username,
        fullName: user.fullName,
        roles: user.roles 
      } });
} catch (error) {
    res.status(500).json({ error: error.message });
}
});
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body; // ⭐ Thay từ tokenId
    
    if (!credential) {
      console.error("🚫 Thiếu credential");
      return res.status(400).json({ error: 'Thiếu token.' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("🚫 GOOGLE_CLIENT_ID chưa set");
      return res.status(500).json({ error: "Lỗi cấu hình server" });
    }

    // ⭐ Verify token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    console.log(`✅ Google verified: ${email}`);

    // Kiểm tra user
    let user = await User.findOne({ email });
    
    if (!user) {
      // Tạo user mới
      user = new User({
        username: email.split("@")[0], // ⭐ Dùng phần trước @
        email,
        fullName: name,
        avatarUrl: picture,
        googleId,
        roles: ["student"],
      });
      await user.save();
      console.log(`📝 User mới: ${email}`);
    } else {
      // Link Google nếu chưa link
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
        console.log(`🔗 Linked Google: ${email}`);
      }
    }

    // Tạo JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        roles: user.roles 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '✅ Đăng nhập Google thành công',
      token,
      user: {
        _id: user._id,
        name: user.username,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roles: user.roles
      }
    });

  } catch (err) {
    console.error("❌ Google login error:", err.message);
    res.status(401).json({ error: 'Token Google không hợp lệ' });
  }
});
/*
router.post('/google-login', async (req, res) => {
  const { tokenId } = req.body; // token từ frontend
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error("🚫 LỖI CẤU HÌNH: Thiếu GOOGLE_CLIENT_ID trong .env");
    return res.status(500).json({ error: "Lỗi cấu hình server. Vui lòng liên hệ admin." });
  }
  if (!tokenId) {
    console.error("🚫 LỖI FRONTEND: Thiếu tokenId trong request body.");
    return res.status(400).json({ error: 'Thiếu thông tin Google Token.' });
  }
  try {
    // Xác thực token với Google
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // payload chứa thông tin user Google
    const { email, username, picture, sub: googleId  } = payload;
    console.log(`✅ Google Token verified. User: ${email}`);
    // Kiểm tra user trong database
    let user = await User.findOne({ email });
    if (!user) {
      // Nếu chưa có, tạo mới
      user = new User({
        username,
        email,
        googleId , // đăng nhập Google không cần password
        roles: ["student"],
      });
      await user.save();
      console.log(`📝 User mới tạo qua Google: ${email}`);
    }else {
      console.log(`🔍 User đã tồn tại: ${email}`);
      // Trường hợp người dùng cũ đăng ký bằng email/mật khẩu, nay dùng Google login lần đầu.
      if (!user.googleId) {
        user.googleId = googleId; // Liên kết tài khoản
        await user.save();
        console.log(`🔗 Liên kết Google ID cho user đã tồn tại: ${email}`);
      }
    }

    // Tạo JWT token cho ứng dụng
    const token = jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Đăng nhập bằng Google thành công', token, user: { id: user._id, name: user.name, email: user.email, roles: user.roles } });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Token Google không hợp lệ' });
  }
});
*/
router.post("/add-teacher-role", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // ✅ Check đã là teacher chưa
    if (user.roles.includes('teacher')) {
      return res.status(400).json({ 
        success: false, 
        message: "Already a teacher" 
      });
    }

    // ✅ Thêm 'teacher' vào roles array
    user.roles.push('teacher');
    
    // ✅ Init teacherStats nếu chưa có
    if (!user.teacherStats.totalCourses) {
      user.teacherStats = {
        totalStudents: 0,
        averageRating: 0,
        totalCourses: 0,
        totalEarnings: 0,
        updatedAt: Date.now()
      };
    }
    
    await user.save();

    res.json({
      success: true,
      message: "Successfully added teacher role!",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,  // ✅ Return array
        level: user.level
      }
    });

  } catch (err) {
    console.error("❌ Error adding teacher role:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});
module.exports = router;