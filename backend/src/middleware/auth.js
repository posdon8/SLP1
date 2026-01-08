/* backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token, vui lòng đăng nhập'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Attach user to request
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng đăng nhập lại'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error.message
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Chỉ admin mới có quyền truy cập' 
    });
  }
  next();
};
const verifyTeacher = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Thiếu token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || (user.role !== "teacher" && user.role !== "teacher_pro")) {
      return res.status(403).json({ error: "Chỉ giáo viên mới được phép!" });
    }

    req.user = {
  _id: user._id,
  id: user._id.toString(),
  role: user.role,
  email: user.email,
  username: user.username,
  fullName: user.fullName
};

    next();
  } catch (err) {
    res.status(401).json({ error: "Token không hợp lệ!" });
  }
};
module.exports = { authMiddleware, verifyTeacher, adminOnly };
*/

// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// ✅ Verify JWT token - UPDATED
// ========================================
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token, vui lòng đăng nhập'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // ✅ UPDATED: Attach user with roles array
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      roles: user.roles || ['student'],  // ✅ Changed: role → roles (array)
      email: user.email,
      username: user.username,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng đăng nhập lại'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error.message
    });
  }
};

// ========================================
// ✅ Admin Only - UPDATED
// ========================================
const adminOnly = (req, res, next) => {
  // ✅ UPDATED: Kiểm tra roles array
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Chỉ admin mới có quyền truy cập' 
    });
  }
  next();
};

// ========================================
// ✅ Verify Teacher - UPDATED
// ========================================
const verifyTeacher = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Thiếu token" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ 
        success: false,
        error: "User không tồn tại" 
      });
    }

    // ✅ UPDATED: Kiểm tra roles array có 'teacher' không
    if (!user.roles.includes('teacher') && !user.roles.includes('admin')) {
      return res.status(403).json({ 
        success: false,
        error: "Chỉ giáo viên mới được phép!" 
      });
    }

    // ✅ UPDATED: Attach user with roles array
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      roles: user.roles || ['student'],  // ✅ roles (array)
      email: user.email,
      username: user.username,
      fullName: user.fullName
    };

    next();
  } catch (err) {
    console.error('Teacher verification error:', err);
    res.status(401).json({ 
      success: false,
      error: "Token không hợp lệ!" 
    });
  }
};

// ========================================
// ✅ NEW: Verify Student (nếu cần)
// ========================================
const verifyStudent = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Thiếu token" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ 
        success: false,
        error: "User không tồn tại" 
      });
    }

    // ✅ Check roles array có 'student' không
    if (!user.roles.includes('student')) {
      return res.status(403).json({ 
        success: false,
        error: "Chỉ sinh viên mới được phép!" 
      });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      roles: user.roles || ['student'],
      email: user.email,
      username: user.username,
      fullName: user.fullName
    };

    next();
  } catch (err) {
    console.error('Student verification error:', err);
    res.status(401).json({ 
      success: false,
      error: "Token không hợp lệ!" 
    });
  }
};

// ========================================
// ✅ NEW: Helper function - Check role
// ========================================
const hasRole = (role) => {
  return (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền ${role}`
      });
    }
    next();
  };
};

// ========================================
// ✅ NEW: Helper function - Check any role
// ========================================
const hasAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.some(role => req.user.roles.includes(role))) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền hợp lệ`
      });
    }
    next();
  };
};

module.exports = { 
  authMiddleware, 
  verifyTeacher, 
  verifyStudent,
  adminOnly,
  hasRole,
  hasAnyRole
};