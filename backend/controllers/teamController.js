const Team = require("../models/Team");
const User = require("../models/User");
const { getRoleIdByName } = require("../utils/roleHelpers");

// @desc    Create new team
// @route   POST /api/v1/teams
// @access  Private (Admin)
exports.createTeam = async (req, res) => {
    try {
        const { name, description, managers = [], members = [] } = req.body;

        // Validate managers are not Callers
        if (managers.length > 0) {
            const callerRoleId = await getRoleIdByName("Caller");
            const callerManagers = await User.find({
                _id: { $in: managers },
                role: callerRoleId
            });

            if (callerManagers.length > 0) {
                return res.status(400).json({
                    error: "Managers cannot be Callers. Invalid users: " + callerManagers.map(u => u.name).join(", ")
                });
            }
        }

        const team = await Team.create({
            name,
            description,
            managers,
            members
        });

        res.status(201).json({ success: true, data: team });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Team name already exists" });
        }
        console.error("createTeam error:", err);
        res.status(500).json({ error: "Server Error", details: err.message });
    }
};

// @desc    Get all teams
// @route   GET /api/v1/teams
// @access  Private (Admin/Manager)
exports.getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate("managers", "name email role")
            .populate("members", "name email role");

        res.json({ success: true, count: teams.length, data: teams });
    } catch (err) {
        console.error("getAllTeams error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// @desc    Get single team
// @route   GET /api/v1/teams/:id
// @access  Private (Admin/Manager)
exports.getTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate("managers", "name email role")
            .populate("members", "name email role");

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        res.json({ success: true, data: team });
    } catch (err) {
        console.error("getTeam error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// @desc    Update team
// @route   PUT /api/v1/teams/:id
// @access  Private (Admin)
exports.updateTeam = async (req, res) => {
    try {
        const { name, description, managers, members } = req.body;

        // Validate managers input if provided
        if (managers && managers.length > 0) {
            const callerRoleId = await getRoleIdByName("Caller");
            const callerManagers = await User.find({
                _id: { $in: managers },
                role: callerRoleId
            });

            if (callerManagers.length > 0) {
                return res.status(400).json({
                    error: "Managers cannot be Callers. Invalid users: " + callerManagers.map(u => u.name).join(", ")
                });
            }
        }

        const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })
            .populate("managers", "name email role")
            .populate("members", "name email role");

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        res.json({ success: true, data: team });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Team name already exists" });
        }
        console.error("updateTeam error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// @desc    Delete team
// @route   DELETE /api/v1/teams/:id
// @access  Private (Admin)
exports.deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        res.json({ success: true, data: {} });
    } catch (err) {
        console.error("deleteTeam error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};
