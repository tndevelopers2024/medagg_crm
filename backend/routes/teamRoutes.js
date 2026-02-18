const express = require("express");
const {
    createTeam,
    getAllTeams,
    getTeam,
    updateTeam,
    deleteTeam
} = require("../controllers/teamController");

const router = express.Router();

const { protect, checkPermission } = require("../middleware/auth");

router.use(protect);

router
    .route("/")
    .get(checkPermission("teams.teams.view"), getAllTeams)
    .post(checkPermission("teams.teams.create"), createTeam);

router
    .route("/:id")
    .get(checkPermission("teams.teams.view"), getTeam)
    .put(checkPermission("teams.teams.edit"), updateTeam)
    .delete(checkPermission("teams.teams.delete"), deleteTeam);

module.exports = router;
