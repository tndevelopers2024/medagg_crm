const WaTemplate = require("../models/WaTemplate");

// @desc    Get all templates visible to current user (own + global)
// @route   GET /api/v1/wa-templates
// @access  Private
exports.getWaTemplates = async (req, res) => {
  try {
    const templates = await WaTemplate.find({
      $or: [{ userId: req.user._id }, { isGlobal: true }],
    })
      .sort({ isGlobal: -1, updatedAt: -1 })
      .lean();

    res.json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a template
// @route   POST /api/v1/wa-templates
// @access  Private
exports.createWaTemplate = async (req, res) => {
  try {
    const { name, body, isGlobal } = req.body;

    if (!name || !body) {
      return res
        .status(400)
        .json({ success: false, error: "Name and body are required" });
    }

    // Only admin/superadmin/owner can create global templates
    const canGlobal = ["admin", "superadmin", "owner"].includes(req.user.roleName);
    const global = canGlobal && isGlobal ? true : false;

    const template = await WaTemplate.create({
      name,
      body,
      isGlobal: global,
      userId: req.user._id,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update a template
// @route   PUT /api/v1/wa-templates/:id
// @access  Private (owner of template, or admin for global)
exports.updateWaTemplate = async (req, res) => {
  try {
    const template = await WaTemplate.findById(req.params.id);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });
    }

    // Permission check: own template OR admin editing global template
    const isOwner =
      template.userId && template.userId.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "owner"].includes(req.user.roleName);

    if (!isOwner && !(isAdmin && template.isGlobal)) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to edit this template" });
    }

    const { name, body, isGlobal } = req.body;

    if (name !== undefined) template.name = name;
    if (body !== undefined) template.body = body;
    if (isGlobal !== undefined && isAdmin) template.isGlobal = isGlobal;

    await template.save();

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a template
// @route   DELETE /api/v1/wa-templates/:id
// @access  Private (owner of template, or admin for global)
exports.deleteWaTemplate = async (req, res) => {
  try {
    const template = await WaTemplate.findById(req.params.id);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });
    }

    const isOwner =
      template.userId && template.userId.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "owner"].includes(req.user.roleName);

    if (!isOwner && !(isAdmin && template.isGlobal)) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to delete this template" });
    }

    await template.deleteOne();

    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
