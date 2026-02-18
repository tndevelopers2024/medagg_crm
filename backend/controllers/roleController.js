const Role = require("../models/Role");
const User = require("../models/User");
const { PERMISSION_TREE, ALL_PERMISSION_KEYS, DEFAULT_PERMISSIONS } = require("../constants/permissions");

// @desc    Get all roles (with user counts)
// @route   GET /api/v1/roles
// @access  Private/Admin
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();

    // Attach user counts
    const roleCounts = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    for (const rc of roleCounts) {
      if (rc._id) countMap[rc._id.toString()] = rc.count;
    }

    const data = roles.map((r) => ({
      ...r,
      userCount: countMap[r._id.toString()] || 0,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get permission tree (for UI rendering)
// @route   GET /api/v1/roles/permissions
// @access  Private/Admin
exports.getPermissions = async (req, res) => {
  try {
    res.json({ success: true, data: PERMISSION_TREE, defaultPermissions: DEFAULT_PERMISSIONS });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single role
// @route   GET /api/v1/roles/:id
// @access  Private/Admin
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }

    // Attach user count
    const userCount = await User.countDocuments({ role: role._id });
    role.userCount = userCount;

    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create role
// @route   POST /api/v1/roles
// @access  Private/Admin
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    // Validate permission keys
    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter((k) => !ALL_PERMISSION_KEYS.includes(k));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid permission keys: ${invalid.join(", ")}`,
        });
      }
    }

    const role = await Role.create({
      name,
      description,
      permissions: permissions || [],
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: "A role with this name already exists" });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update role
// @route   PUT /api/v1/roles/:id
// @access  Private/Admin
exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }

    const { name, description, permissions } = req.body;

    // Block renaming system roles
    if (role.isSystem && name && name !== role.name) {
      return res.status(400).json({
        success: false,
        error: "Cannot rename system roles",
      });
    }

    // Validate permission keys
    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter((k) => !ALL_PERMISSION_KEYS.includes(k));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid permission keys: ${invalid.join(", ")}`,
        });
      }
      role.permissions = permissions;
    }

    if (name && !role.isSystem) role.name = name;
    if (description !== undefined) role.description = description;

    await role.save();

    res.json({ success: true, data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: "A role with this name already exists" });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete role (requires reassignTo roleId)
// @route   DELETE /api/v1/roles/:id
// @access  Private/Admin
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        error: "System roles cannot be deleted",
      });
    }

    const { reassignTo } = req.body;
    if (!reassignTo) {
      return res.status(400).json({
        success: false,
        error: "reassignTo role ID is required when deleting a role",
      });
    }

    const targetRole = await Role.findById(reassignTo);
    if (!targetRole) {
      return res.status(400).json({
        success: false,
        error: "Target reassignment role not found",
      });
    }

    // Reassign users
    const result = await User.updateMany(
      { role: role._id },
      { $set: { role: targetRole._id } }
    );

    await Role.deleteOne({ _id: role._id });

    res.json({
      success: true,
      message: `Role deleted. ${result.modifiedCount} user(s) reassigned to "${targetRole.name}".`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
