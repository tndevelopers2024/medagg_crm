const WaTemplate = require("../models/WaTemplate");
const LeadActivity = require("../models/LeadActivity");
const Lead = require("../models/Lead");
const { safeLogLeadActivity } = require("../services/activityLogger");

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

// @desc    Bulk create templates from uploaded JSON/CSV data
// @route   POST /api/v1/wa-templates/bulk
// @access  Private
exports.bulkCreateWaTemplates = async (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ success: false, error: "templates array is required" });
    }

    const canGlobal = ["admin", "superadmin", "owner"].includes(req.user.roleName);
    const docs = templates
      .filter((t) => t.name && t.body)
      .map((t) => ({
        name: String(t.name).slice(0, 100),
        body: String(t.body).slice(0, 2000),
        isGlobal: canGlobal && !!t.isGlobal,
        userId: req.user._id,
      }));

    if (docs.length === 0) {
      return res.status(400).json({ success: false, error: "No valid templates found (name and body are required)" });
    }

    const inserted = await WaTemplate.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Log a WhatsApp message sent from the modal as a lead activity
// @route   POST /api/v1/wa-templates/log-send
// @access  Private
exports.logWhatsAppSend = async (req, res) => {
  console.log("=== API /log-send HIT ===");
  try {
    const { leadId, message, templateName } = req.body;
    console.log("PAYLOAD:", { leadId, message, templateName, user: req.user?._id });
    if (!leadId || !message) {
      console.log("ERROR: missing leadId or message");
      return res.status(400).json({ success: false, error: "leadId and message are required" });
    }

    const lead = await Lead.findById(leadId).select("_id").lean();
    console.log("Lead Found:", lead);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;
    const activityLogResult = await safeLogLeadActivity({
      leadId,
      actorId: req.user._id,
      action: "whatsapp_sent",
      description: `WhatsApp sent: ${preview}`,
      diff: {},
      meta: {
        fullMessage: message,
        messageType: "Outgoing",
        templateName: templateName || null,
      },
    });
    console.log("Activity logged successfully!", activityLogResult);

    res.json({ success: true });
  } catch (error) {
    console.error("ERROR in logWhatsAppSend:", error);
    res.status(500).json({ success: false, error: error.message });
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
