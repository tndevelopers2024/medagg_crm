const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Try to populate role — may fail if role is still a legacy string (pre-migration)
    let user = await User.findById(decoded.id);
    if (user) {
      try { await user.populate('role'); } catch (_) { /* legacy string role, skip */ }
    }

    if (!user) {
      return next(new ErrorResponse('No user found with this ID', 404));
    }

    // Check if email is verified (except for certain routes)
    const allowedUnverifiedRoutes = [
      '/api/v1/auth/resend-verification',
      '/api/v1/auth/verify-email',
      '/api/v1/auth/logout'
    ];

    const isDev = process.env.NODE_ENV === 'development';
    if (!user.isVerified && !isDev && !allowedUnverifiedRoutes.includes(req.originalUrl)) {
      return next(
        new ErrorResponse('Please verify your email to access this route', 403)
      );
    }

    // Attach role-related helpers to req.user
    // Handle both populated Role document AND legacy string role (pre-migration)
    const rawRole = user.role;
    const roleDoc = rawRole && typeof rawRole === 'object' && rawRole.name ? rawRole : null;
    const legacyRoleName = typeof rawRole === 'string' ? rawRole : '';
    const roleName = roleDoc?.name || decoded.roleName || decoded.role || legacyRoleName || '';
    const permissions = roleDoc?.permissions || [];
    const isAdmin = roleName.toLowerCase() === 'admin';
    const isSystemAdmin = roleDoc ? !!(roleDoc.isSystem && isAdmin) : isAdmin;

    req.user = user;
    req.user.roleName = roleName;
    req.user.permissions = permissions;
    req.user.isSystemAdmin = isSystemAdmin;

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles (by name)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // System admin always passes
    if (req.user.isSystemAdmin) {
      return next();
    }

    const userRoleName = (req.user.roleName || '').toLowerCase();
    if (roles.map((r) => r.toLowerCase()).includes(userRoleName)) {
      return next();
    }

    // Custom role with permissions — let checkPermission handle the fine-grained check
    if (req.user.permissions && req.user.permissions.length > 0) {
      return next();
    }

    return next(
      new ErrorResponse(
        `User role ${userRoleName} is not authorized to access this route`,
        403
      )
    );
  };
};

// Check a specific permission key (for Phase 2 granular enforcement)
// Check a specific permission key (for Phase 2 granular enforcement)
exports.checkPermission = (permissionKeyOrList) => {
  return (req, res, next) => {
    // System admin bypasses
    if (req.user.isSystemAdmin) {
      return next();
    }

    const required = Array.isArray(permissionKeyOrList) ? permissionKeyOrList : [permissionKeyOrList];
    const hasOne = required.some(key => (req.user.permissions || []).includes(key));

    if (!hasOne) {
      return next(
        new ErrorResponse(
          `You do not have permission: ${required.join(' OR ')}`,
          403
        )
      );
    }
    next();
  };
};

// Middleware to check if email is verified
exports.requireVerifiedEmail = async (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  if (!req.user.isVerified && !isDev) {
    return next(
      new ErrorResponse('Please verify your email to access this route', 403)
    );
  }
  next();
};
