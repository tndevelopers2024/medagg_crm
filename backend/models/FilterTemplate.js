const mongoose = require('mongoose');

const filterTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Filter configuration
    filters: {
        // Standard filters
        status: [String],
        assignee: [String], // Changed from ObjectId to support "All Callers", "Unassigned"
        stage: [String],    // Changed to String for flexibility
        campaign: [String], // Changed to String for flexibility
        source: [String],
        rating: [Number],
        followup: [String],
        opd: [String],
        ipd: [String],
        diagnostic: [String],

        // Date filters
        dateField: String, // 'createdAt', 'updatedAt', etc.
        dateMode: String, // 'Today', 'Yesterday', '7d', '30d', 'Custom'
        dateRange: {
            start: Date,
            end: Date
        },

        // Custom field filters
        customFields: [{
            fieldId: mongoose.Schema.Types.ObjectId,
            operator: String, // 'equals', 'contains', 'in', etc.
            value: mongoose.Schema.Types.Mixed
        }],

        // Search
        searchQuery: String
    },

    // Sorting configuration
    sorting: {
        field: String,
        order: String // 'asc' or 'desc'
    },

    // Column visibility configuration
    columnVisibility: {
        type: Map,
        of: Boolean,
        default: () => new Map()
    },

    // Metadata
    isDefault: {
        type: Boolean,
        default: false
    },
    isShared: {
        type: Boolean,
        default: false // Future: allow sharing templates with team
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsedAt: Date
}, {
    timestamps: true
});

// Indexes
filterTemplateSchema.index({ userId: 1, name: 1 });
filterTemplateSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model('FilterTemplate', filterTemplateSchema);
