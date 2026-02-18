const FilterTemplate = require('../models/FilterTemplate');

// @desc    Get all filter templates for current user
// @route   GET /api/v1/filter-templates
// @access  Private
exports.getFilterTemplates = async (req, res) => {
    try {
        const templates = await FilterTemplate.find({ userId: req.user._id })
            .sort({ isDefault: -1, usageCount: -1, updatedAt: -1 });

        res.json({
            success: true,
            count: templates.length,
            data: templates
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single filter template
// @route   GET /api/v1/filter-templates/:id
// @access  Private
exports.getFilterTemplateById = async (req, res) => {
    try {
        const template = await FilterTemplate.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new filter template
// @route   POST /api/v1/filter-templates
// @access  Private
exports.createFilterTemplate = async (req, res) => {
    try {
        const { name, description, filters, sorting, columnVisibility, isDefault } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await FilterTemplate.updateMany(
                { userId: req.user._id, isDefault: true },
                { isDefault: false }
            );
        }

        const template = await FilterTemplate.create({
            name,
            description,
            userId: req.user._id,
            filters,
            sorting,
            columnVisibility: columnVisibility || new Map(),
            isDefault: isDefault || false
        });

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update filter template
// @route   PUT /api/v1/filter-templates/:id
// @access  Private
exports.updateFilterTemplate = async (req, res) => {
    try {
        const { name, description, filters, sorting, columnVisibility, isDefault } = req.body;

        const template = await FilterTemplate.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        // If setting as default, unset other defaults
        if (isDefault && !template.isDefault) {
            await FilterTemplate.updateMany(
                { userId: req.user._id, isDefault: true },
                { isDefault: false }
            );
        }

        template.name = name || template.name;
        template.description = description !== undefined ? description : template.description;
        template.filters = filters || template.filters;
        template.sorting = sorting || template.sorting;
        template.columnVisibility = columnVisibility !== undefined ? columnVisibility : template.columnVisibility;
        template.isDefault = isDefault !== undefined ? isDefault : template.isDefault;

        await template.save();

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete filter template
// @route   DELETE /api/v1/filter-templates/:id
// @access  Private
exports.deleteFilterTemplate = async (req, res) => {
    try {
        const template = await FilterTemplate.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Set template as default
// @route   PUT /api/v1/filter-templates/:id/set-default
// @access  Private
exports.setDefaultTemplate = async (req, res) => {
    try {
        // Unset all defaults
        await FilterTemplate.updateMany(
            { userId: req.user._id, isDefault: true },
            { isDefault: false }
        );

        // Set new default
        const template = await FilterTemplate.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isDefault: true },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Track template usage
// @route   POST /api/v1/filter-templates/:id/apply
// @access  Private
exports.applyTemplate = async (req, res) => {
    try {
        const template = await FilterTemplate.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            {
                $inc: { usageCount: 1 },
                lastUsedAt: new Date()
            },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
