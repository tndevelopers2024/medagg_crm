const express = require("express");
const {
  getRoles,
  getPermissions,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");
const { protect, authorize, checkPermission } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.route("/")
  .get(checkPermission("roles.roles.view"), getRoles)
  .post(checkPermission("roles.roles.create"), createRole);

router.route("/permissions")
  .get(checkPermission("roles.roles.view"), getPermissions);

router.route("/:id")
  .get(checkPermission("roles.roles.view"), getRole)
  .put(checkPermission("roles.roles.edit"), updateRole)
  .delete(checkPermission("roles.roles.delete"), deleteRole);

module.exports = router;
