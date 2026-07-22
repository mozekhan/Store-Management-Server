const rbacMiddleware = (requiredPermissions = []) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Super Admin bypasses permission checks
    if (user.role === "SUPER_ADMIN") {
      return next();
    }

    const permissions = user.permissions || [];

    // User needs ANY of the required permissions
    const hasPermission = requiredPermissions.some(permission =>
      permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

module.exports = rbacMiddleware;