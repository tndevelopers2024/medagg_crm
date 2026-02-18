const BookingFieldConfig = require("../models/BookingFieldConfig");

// GET /api/v1/booking-fields - Get booking field configurations
const getBookingFields = async (req, res) => {
    try {
        const { type, active } = req.query;
        const filter = {};

        if (type && ["OP", "IP", "DIAGNOSTIC"].includes(type.toUpperCase())) {
            filter.bookingType = type.toUpperCase();
        }

        if (active !== undefined) {
            filter.isActive = active === "true";
        }

        const fields = await BookingFieldConfig.find(filter).sort({ bookingType: 1, order: 1 });
        return res.json({ success: true, count: fields.length, data: fields });
    } catch (err) {
        console.error("Error fetching booking fields:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/booking-fields - Create new booking field configuration
const createBookingField = async (req, res) => {
    try {
        const {
            bookingType,
            fieldName,
            displayLabel,
            fieldType,
            isRequired,
            isActive,
            options,
            defaultValue,
            placeholder,
            validation,
        } = req.body;

        if (!bookingType || !["OP", "IP", "DIAGNOSTIC"].includes(bookingType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: "bookingType must be one of 'OP', 'IP', or 'DIAGNOSTIC'",
            });
        }

        if (!fieldName || !displayLabel) {
            return res.status(400).json({
                success: false,
                error: "fieldName and displayLabel are required",
            });
        }

        // Check if field already exists for this booking type
        const existing = await BookingFieldConfig.findOne({
            bookingType: bookingType.toUpperCase(),
            fieldName: fieldName.toLowerCase(),
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Field '${fieldName}' already exists for ${bookingType} bookings`,
            });
        }

        // Validate dropdown has options
        if (fieldType === "dropdown" && (!options || options.length === 0)) {
            return res.status(400).json({
                success: false,
                error: "Dropdown fields must have at least one option",
            });
        }

        // Get max order for this booking type
        const maxOrderField = await BookingFieldConfig.findOne({
            bookingType: bookingType.toUpperCase(),
        }).sort({ order: -1 });
        const order = maxOrderField ? maxOrderField.order + 1 : 0;

        const field = await BookingFieldConfig.create({
            bookingType: bookingType.toUpperCase(),
            fieldName: fieldName.toLowerCase(),
            displayLabel,
            fieldType: fieldType || "text",
            isRequired: isRequired || false,
            isActive: isActive !== undefined ? isActive : true,
            order,
            options: options || [],
            defaultValue: defaultValue || "",
            placeholder: placeholder || "",
            validation: validation || {},
        });

        return res.status(201).json({ success: true, data: field });
    } catch (err) {
        console.error("Error creating booking field:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PUT /api/v1/booking-fields/:id - Update booking field configuration
const updateBookingField = async (req, res) => {
    try {
        const { id } = req.params;
        const field = await BookingFieldConfig.findById(id);

        if (!field) {
            return res.status(404).json({ success: false, error: "Field not found" });
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
            "defaultValue",
            "placeholder",
            "validation",
        ];

        allowedFields.forEach((key) => {
            if (req.body[key] !== undefined) {
                field[key] = req.body[key];
            }
        });

        await field.save();
        return res.json({ success: true, data: field });
    } catch (err) {
        console.error("Error updating booking field:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// DELETE /api/v1/booking-fields/:id - Delete booking field configuration
const deleteBookingField = async (req, res) => {
    try {
        const { id } = req.params;
        const field = await BookingFieldConfig.findById(id);

        if (!field) {
            return res.status(404).json({ success: false, error: "Field not found" });
        }

        await BookingFieldConfig.findByIdAndDelete(id);
        return res.json({ success: true, message: "Field deleted successfully" });
    } catch (err) {
        console.error("Error deleting booking field:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PATCH /api/v1/booking-fields/reorder - Reorder booking fields
const reorderBookingFields = async (req, res) => {
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

        await BookingFieldConfig.bulkWrite(bulkOps);

        const fields = await BookingFieldConfig.find().sort({ bookingType: 1, order: 1 });
        return res.json({ success: true, data: fields });
    } catch (err) {
        console.error("Error reordering booking fields:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

module.exports = {
    getBookingFields,
    createBookingField,
    updateBookingField,
    deleteBookingField,
    reorderBookingFields,
};
