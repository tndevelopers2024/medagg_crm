const LeadStageConfig = require("../models/LeadStageConfig");

// GET /api/v1/lead-stages - Get all lead stage configurations
const getLeadStages = async (req, res) => {
    try {
        const { category, active } = req.query;
        const filter = {};

        if (category && ["initial", "active", "won", "lost"].includes(category.toLowerCase())) {
            filter.stageCategory = category.toLowerCase();
        }

        if (active !== undefined) {
            filter.isActive = active === "true";
        }

        const stages = await LeadStageConfig.find(filter).sort({ stageCategory: 1, order: 1 });
        return res.json({ success: true, count: stages.length, data: stages });
    } catch (err) {
        console.error("Error fetching lead stages:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/lead-stages - Create new lead stage
const createLeadStage = async (req, res) => {
    try {
        const {
            stageName,
            displayLabel,
            stageCategory,
            color,
            icon,
            isDefault,
            description,
        } = req.body;

        if (!stageName || !displayLabel) {
            return res.status(400).json({
                success: false,
                error: "stageName and displayLabel are required",
            });
        }

        // Check if stage already exists
        const existing = await LeadStageConfig.findOne({
            stageName: stageName.toLowerCase(),
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Stage '${stageName}' already exists`,
            });
        }

        // Get max order for this category
        const maxOrderStage = await LeadStageConfig.findOne({
            stageCategory: stageCategory || "active",
        }).sort({ order: -1 });
        const order = maxOrderStage ? maxOrderStage.order + 1 : 0;

        const stage = await LeadStageConfig.create({
            stageName: stageName.toLowerCase(),
            displayLabel,
            stageCategory: stageCategory || "active",
            color: color || "#6B7280",
            icon: icon || "",
            order,
            isDefault: isDefault || false,
            description: description || "",
        });

        return res.status(201).json({ success: true, data: stage });
    } catch (err) {
        console.error("Error creating lead stage:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PUT /api/v1/lead-stages/:id - Update lead stage
const updateLeadStage = async (req, res) => {
    try {
        const { id } = req.params;
        const stage = await LeadStageConfig.findById(id);

        if (!stage) {
            return res.status(404).json({ success: false, error: "Stage not found" });
        }

        // Update allowed fields
        const allowedFields = [
            "displayLabel",
            "stageCategory",
            "color",
            "icon",
            "isActive",
            "isDefault",
            "description",
        ];

        allowedFields.forEach((key) => {
            if (req.body[key] !== undefined) {
                stage[key] = req.body[key];
            }
        });

        await stage.save();
        return res.json({ success: true, data: stage });
    } catch (err) {
        console.error("Error updating lead stage:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// DELETE /api/v1/lead-stages/:id - Delete lead stage
const deleteLeadStage = async (req, res) => {
    try {
        const { id } = req.params;
        const stage = await LeadStageConfig.findById(id);

        if (!stage) {
            return res.status(404).json({ success: false, error: "Stage not found" });
        }

        // Prevent deletion of default stage
        if (stage.isDefault) {
            return res.status(400).json({
                success: false,
                error: "Cannot delete the default stage",
            });
        }

        await LeadStageConfig.findByIdAndDelete(id);
        return res.json({ success: true, message: "Stage deleted successfully" });
    } catch (err) {
        console.error("Error deleting lead stage:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PATCH /api/v1/lead-stages/reorder - Reorder lead stages
const reorderLeadStages = async (req, res) => {
    try {
        const { stageOrders } = req.body; // Array of { id, order }

        if (!Array.isArray(stageOrders)) {
            return res.status(400).json({
                success: false,
                error: "stageOrders must be an array of { id, order }",
            });
        }

        // Bulk update orders
        const bulkOps = stageOrders.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { order } },
            },
        }));

        await LeadStageConfig.bulkWrite(bulkOps);

        const stages = await LeadStageConfig.find().sort({ stageCategory: 1, order: 1 });
        return res.json({ success: true, data: stages });
    } catch (err) {
        console.error("Error reordering lead stages:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

module.exports = {
    getLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
    reorderLeadStages,
};
