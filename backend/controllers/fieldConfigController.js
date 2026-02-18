const LeadFieldConfig = require("../models/LeadFieldConfig");

// GET /api/v1/lead-fields - Get all field configurations
const getFieldConfigs = async (req, res) => {
    try {
        const { active } = req.query;
        const filter = {};

        if (active !== undefined) {
            filter.isActive = active === "true";
        }

        const fields = await LeadFieldConfig.find(filter).sort({ order: 1 });
        return res.json({ success: true, count: fields.length, data: fields });
    } catch (err) {
        console.error("Error fetching field configs:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/lead-fields - Create new field configuration
const createFieldConfig = async (req, res) => {
    try {
        const {
            fieldName,
            displayLabel,
            fieldType,
            isRequired,
            isActive,
            options,
            icon,
            validation,
            defaultValue,
            placeholder,
        } = req.body;

        if (!fieldName || !displayLabel) {
            return res.status(400).json({
                success: false,
                error: "fieldName and displayLabel are required",
            });
        }

        // Check if field already exists
        const existing = await LeadFieldConfig.findOne({ fieldName: fieldName.toLowerCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: "Field with this name already exists",
            });
        }

        // Validate dropdown has options
        if (fieldType === "dropdown" && (!options || options.length === 0)) {
            return res.status(400).json({
                success: false,
                error: "Dropdown fields must have at least one option",
            });
        }

        // Get max order and increment
        const maxOrderField = await LeadFieldConfig.findOne().sort({ order: -1 });
        const order = maxOrderField ? maxOrderField.order + 1 : 0;

        const field = await LeadFieldConfig.create({
            fieldName: fieldName.toLowerCase(),
            displayLabel,
            fieldType: fieldType || "text",
            isPrimary: false, // Only set manually for Name/Phone
            isRequired: isRequired || false,
            isActive: isActive !== undefined ? isActive : true,
            order,
            options: options || [],
            icon: icon || "text",
            validation: validation || {},
            defaultValue: defaultValue || "",
            placeholder: placeholder || "",
        });

        return res.status(201).json({ success: true, data: field });
    } catch (err) {
        console.error("Error creating field config:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PUT /api/v1/lead-fields/:id - Update field configuration
const updateFieldConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const field = await LeadFieldConfig.findById(id);

        if (!field) {
            return res.status(404).json({ success: false, error: "Field not found" });
        }

        // Prevent editing primary fields' core properties
        if (field.isPrimary) {
            const allowedUpdates = ["displayLabel", "isRequired", "isActive", "placeholder", "icon"];
            const updates = Object.keys(req.body);
            const hasDisallowedUpdate = updates.some(key => !allowedUpdates.includes(key));

            if (hasDisallowedUpdate) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot modify fieldName or fieldType of primary fields",
                });
            }
        }

        // Validate dropdown options if changing to dropdown
        if (req.body.fieldType === "dropdown" && (!req.body.options || req.body.options.length === 0)) {
            return res.status(400).json({
                success: false,
                error: "Dropdown fields must have at least one option",
            });
        }

        // Update allowed fields
        const allowedFields = [
            "displayLabel",
            "fieldType",
            "isRequired",
            "isActive",
            "options",
            "icon",
            "validation",
            "defaultValue",
            "placeholder",
        ];

        allowedFields.forEach(key => {
            if (req.body[key] !== undefined) {
                field[key] = req.body[key];
            }
        });

        await field.save();
        return res.json({ success: true, data: field });
    } catch (err) {
        console.error("Error updating field config:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// DELETE /api/v1/lead-fields/:id - Delete field configuration
const deleteFieldConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const field = await LeadFieldConfig.findById(id);

        if (!field) {
            return res.status(404).json({ success: false, error: "Field not found" });
        }

        // Prevent deletion of primary fields
        if (field.isPrimary) {
            return res.status(400).json({
                success: false,
                error: "Cannot delete primary fields (Name, Phone)",
            });
        }

        await LeadFieldConfig.findByIdAndDelete(id);
        return res.json({ success: true, message: "Field deleted successfully" });
    } catch (err) {
        console.error("Error deleting field config:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PATCH /api/v1/lead-fields/reorder - Reorder fields
const reorderFields = async (req, res) => {
    try {
        const { fieldOrders } = req.body; // Array of { id, order }

        if (!Array.isArray(fieldOrders)) {
            return res.status(400).json({
                success: false,
                error: "fieldOrders must be an array of { id, order }",
            });
        }

        // Bulk update orders
        const bulkOps = fieldOrders.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { order } },
            },
        }));

        await LeadFieldConfig.bulkWrite(bulkOps);

        const fields = await LeadFieldConfig.find().sort({ order: 1 });
        return res.json({ success: true, data: fields });
    } catch (err) {
        console.error("Error reordering fields:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

module.exports = {
    getFieldConfigs,
    createFieldConfig,
    updateFieldConfig,
    deleteFieldConfig,
    reorderFields,
};
