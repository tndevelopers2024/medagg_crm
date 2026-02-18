const Alarm = require("../models/Alarm");
const Lead = require("../models/Lead");
const { getIO } = require("../utils/socket");

// Create a new alarm
exports.createAlarm = async (req, res) => {
    try {
        const { leadId, alarmTime, notes } = req.body;
        const userId = req.user._id;

        // Validate lead exists and user has access
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        // Check if user is admin or assigned to this lead
        const { role } = req.user || {};
        const isAdmin = ["admin", "superadmin", "owner"].includes(role);
        if (!isAdmin && String(lead.assignedTo) !== String(userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Create alarm
        const alarm = new Alarm({
            lead: leadId,
            user: userId,
            alarmTime: new Date(alarmTime),
            notes: notes || "",
            status: "active",
        });

        await alarm.save();

        // Populate lead details for response
        await alarm.populate("lead", "fieldData");

        // Emit socket event for real-time update
        try {
            const io = getIO();
            io.to(userId.toString()).emit("alarm:created", {
                alarmId: alarm._id,
                userId: userId.toString(),
            });
        } catch (socketError) {
            console.error("Socket emit error:", socketError);
        }

        res.status(201).json(alarm);
    } catch (error) {
        console.error("Create alarm error:", error);
        res.status(500).json({ error: "Failed to create alarm" });
    }
};

// Get user's alarms
exports.getUserAlarms = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, limit = 100 } = req.query;

        const query = { user: userId };

        // Filter by status if provided
        if (status) {
            if (status === "active") {
                query.status = { $in: ["active", "snoozed"] };
            } else {
                query.status = status;
            }
        }

        const alarms = await Alarm.find(query)
            .populate("lead", "fieldData campaignId")
            .sort({ alarmTime: 1 })
            .limit(parseInt(limit));

        res.json(alarms);
    } catch (error) {
        console.error("Get alarms error:", error);
        res.status(500).json({ error: "Failed to fetch alarms" });
    }
};

// Get active alarms count
exports.getActiveAlarmsCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const count = await Alarm.countDocuments({
            user: userId,
            status: { $in: ["active", "snoozed"] },
            alarmTime: { $gte: new Date() },
        });

        res.json({ count });
    } catch (error) {
        console.error("Get alarm count error:", error);
        res.status(500).json({ error: "Failed to get alarm count" });
    }
};

// Update alarm (snooze/dismiss)
exports.updateAlarm = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, snoozedUntil } = req.body;
        const userId = req.user._id;

        // Find alarm and verify ownership
        const alarm = await Alarm.findOne({ _id: id, user: userId });
        if (!alarm) {
            return res.status(404).json({ error: "Alarm not found" });
        }

        // Update alarm
        if (status) {
            alarm.status = status;
        }
        if (snoozedUntil) {
            alarm.snoozedUntil = new Date(snoozedUntil);
            alarm.status = "snoozed";
        }

        await alarm.save();
        await alarm.populate("lead", "fieldData");

        // Emit socket event for real-time update
        try {
            const io = getIO();
            io.to(userId.toString()).emit("alarm:updated", {
                alarmId: alarm._id,
                status: alarm.status,
                userId: userId.toString(),
            });
        } catch (socketError) {
            console.error("Socket emit error:", socketError);
        }

        res.json(alarm);
    } catch (error) {
        console.error("Update alarm error:", error);
        res.status(500).json({ error: "Failed to update alarm" });
    }
};

// Delete alarm
exports.deleteAlarm = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const alarm = await Alarm.findOneAndDelete({ _id: id, user: userId });
        if (!alarm) {
            return res.status(404).json({ error: "Alarm not found" });
        }

        // Emit socket event for real-time update
        try {
            const io = getIO();
            io.to(userId.toString()).emit("alarm:deleted", {
                alarmId: id,
                userId: userId.toString(),
            });
        } catch (socketError) {
            console.error("Socket emit error:", socketError);
        }

        res.json({ message: "Alarm deleted successfully" });
    } catch (error) {
        console.error("Delete alarm error:", error);
        res.status(500).json({ error: "Failed to delete alarm" });
    }
};

// Get alarm for specific lead
exports.getLeadAlarm = async (req, res) => {
    try {
        const { leadId } = req.params;
        const userId = req.user._id;

        const alarm = await Alarm.findOne({
            lead: leadId,
            user: userId,
            status: { $in: ["active", "snoozed"] },
        }).sort({ alarmTime: 1 });

        res.json(alarm);
    } catch (error) {
        console.error("Get lead alarm error:", error);
        res.status(500).json({ error: "Failed to fetch lead alarm" });
    }
};
