// middleware/optionalAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Lấy user từ DB để có đầy đủ thông tin
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      req.user = null;
      return next();
    }

    // ✅ Set req.user với đầy đủ info
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      roles: user.roles || ["student"],
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    };
  } catch (err) {
    console.error("❌ optionalAuth error:", err.message);
    req.user = null;
  }

  next();
};