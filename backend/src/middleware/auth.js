// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// ✅ Verify JWT token - UPDATED with DEBUG
// ========================================
const authMiddleware = async (req, res, next) => {
  try {
    // 🔍 DEBUG: Log request info
    console.log('🔍 Auth Request:', {
      method: req.method,
      url: req.originalUrl,
      hasAuthHeader: !!req.header('Authorization')
    });

    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('❌ No Authorization header');
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token, vui lòng đăng nhập'
      });
    }

    // Extract token
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      token = authHeader;
    }

    console.log('🔍 Token extracted:', {
      length: token.length,
      preview: token.substring(0, 20) + '...'
    });

    if (!token || token === 'null' || token === 'undefined') {
      console.log('❌ Invalid token value');
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    console.log('✅ Token decoded:', { userId: decoded.id });

    // Find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    console.log('✅ User authenticated:', { 
      username: user.username, 
      roles: user.roles 
    });

    // ✅ Attach user with roles array
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      roles: user.roles || ['student'],
      email: user.email,
      username: user.username,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', {
      name: error.name,
      message: error.message
    });
    
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
// ✅ Admin Only
// ========================================
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
    console.log('❌ Admin access denied:', req.user?.username);
    return res.status(403).json({ 
      success: false, 
      message: 'Chỉ admin mới có quyền truy cập' 
    });
  }
  next();
};

// ========================================
// ✅ Verify Teacher
// ========================================
const verifyTeacher = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: "Thiếu token" 
      });
    }

    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      token = authHeader;
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ 
        success: false,
        error: "Token không hợp lệ" 
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

    // ✅ Check roles array
    const hasTeacherRole = user.roles && (
      user.roles.includes('teacher') || 
      user.roles.includes('admin')
    );

    if (!hasTeacherRole) {
      console.log('❌ Teacher access denied:', {
        username: user.username,
        roles: user.roles
      });
      return res.status(403).json({ 
        success: false,
        error: "Chỉ giáo viên mới được phép!" 
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
    console.error('❌ Teacher verification error:', err.message);
    res.status(401).json({ 
      success: false,
      error: "Token không hợp lệ!" 
    });
  }
};

// ========================================
// ✅ Verify Student
// ========================================
const verifyStudent = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: "Thiếu token" 
      });
    }

    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      token = authHeader;
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ 
        success: false,
        error: "Token không hợp lệ" 
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

    const hasStudentRole = user.roles && user.roles.includes('student');

    if (!hasStudentRole) {
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
    console.error('❌ Student verification error:', err.message);
    res.status(401).json({ 
      success: false,
      error: "Token không hợp lệ!" 
    });
  }
};

// ========================================
// ✅ Helper: Check specific role
// ========================================
const hasRole = (role) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền ${role}`
      });
    }
    next();
  };
};

// ========================================
// ✅ Helper: Check any of multiple roles
// ========================================
const hasAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: 'Không có thông tin roles'
      });
    }

    const hasPermission = roles.some(role => req.user.roles.includes(role));
    
    if (!hasPermission) {
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
/*
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
*/