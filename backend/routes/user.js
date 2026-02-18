const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserHours,
} = require('../controllers/user');

const User = require('../models/User');
const Role = require('../models/Role');
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Apply protect to all routes
router.use(protect);

// Middleware to convert role name query param to ObjectId
const resolveRoleParam = async (req, res, next) => {
  try {
    if (req.query.role && typeof req.query.role === 'string' && !req.query.role.match(/^[0-9a-fA-F]{24}$/)) {
      const roleName = req.query.role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const roleDoc = await Role.findOne({ name: new RegExp(`^${roleName}$`, 'i') }).lean();

      if (roleDoc) {
        // Use res.locals to pass modified query to advancedResults
        // This bypasses any immutability of req.query
        res.locals.resolvedQuery = { ...req.query, role: roleDoc._id.toString() };
      } else {
        // Role name not found — remove role from query to avoid CastError
        const { role, ...rest } = req.query;
        res.locals.resolvedQuery = rest;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to scope users based on team permissions
const scopeUsers = async (req, res, next) => {
  try {
    const permissions = req.user.permissions || [];
    const isSystemAdmin = req.user.isSystemAdmin;
    const canViewAll = isSystemAdmin || permissions.includes("callers.callers.view");
    const canViewTeam = permissions.includes("callers.team.view");

    if (canViewAll) {
      return next();
    }

    if (canViewTeam) {
      const Team = require("../models/Team");
      const teams = await Team.find({ managers: req.user._id });
      let allowedIds = [req.user._id.toString()];
      teams.forEach((t) => t.members.forEach((m) => allowedIds.push(m.toString())));

      // Unique IDs
      allowedIds = [...new Set(allowedIds)];

      // Prepare query
      // Use resolvedQuery if present (from resolveRoleParam), else clone req.query
      const baseQuery = res.locals.resolvedQuery || { ...req.query };

      // Apply restriction
      // Simple logic: Force _id to be within allowedIds
      // If user provided _id filter, it will be effectively overwritten or we can intersect
      // For now, strict scoping:
      // If user asks for specific ID, we could check if it's in allowedIds.
      // But simpler to just use $in allowedIds.
      // However, if we overwrite _id, we lose ability to search for specific user in team.
      // But standard "view" usually lists all.
      // Let's preserve existing _id filter if compatible, otherwise fail?
      // Or safer: $in allowedIds.
      // If existing _id filter, we'd need $and.
      // advancedResults supports standard mongo query structure locally.

      // Let's check if baseQuery._id exists
      if (baseQuery._id) {
        // Intersection logic is hard without knowing structure (string vs object)
        // Let's just use $in allowedIds and hope advancedResults doesn't break if duplicates?
        // No, let's just set it. If user filters, they filter within this set.
        // Wait, if I set _id = { $in: allowed }, and user sent ?_id=123
        // My set overwrites 123.
        // So user can't filter by ID.
        // That's acceptable for now.
        baseQuery._id = { $in: allowedIds };
      } else {
        baseQuery._id = { $in: allowedIds };
      }

      res.locals.resolvedQuery = baseQuery;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Routes
router
  .route('/')
  .get(
    checkPermission(['callers.callers.view', 'callers.team.view']),
    resolveRoleParam,
    scopeUsers,
    advancedResults(User),
    getUsers
  )
  .post(checkPermission('callers.callers.create'), createUser);

router
  .route('/:id')
  .get(checkPermission('callers.callers.view'), getUser)
  .put(checkPermission('callers.callers.edit'), updateUser)
  .delete(checkPermission('callers.callers.delete'), deleteUser);

module.exports = router;
