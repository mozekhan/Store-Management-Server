// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// const protect = async (req, res, next) => {
//   try {
//     const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Access denied. No token provided.'
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.userId)
//       .populate('storeId')
//       .select('-password -refreshToken');
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({
//         success: false,
//         message: 'Account is deactivated'
//       });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Token expired'
//       });
//     }
//     return res.status(401).json({
//       success: false,
//       message: 'Invalid token'
//     });
//   }
// };

// module.exports = protect;




















const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { RolePermissions } = require("../config/roles");

const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .populate("storeId")
      .select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    // Convert Mongoose document to plain object
    const userObject = user.toObject();

    // Attach permissions based on role
    userObject.permissions = RolePermissions[user.role] || [];

    req.user = userObject;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

module.exports = protect;