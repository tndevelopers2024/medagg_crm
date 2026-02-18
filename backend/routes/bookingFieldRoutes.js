const express = require("express");
const router = express.Router();
const {
    getBookingFields,
    createBookingField,
    updateBookingField,
    deleteBookingField,
    reorderBookingFields,
} = require("../controllers/bookingFieldController");
const { protect, authorize, checkPermission } = require("../middleware/auth");

// GET route
router.route("/").get(protect, checkPermission("settings.bookingFields.view"), getBookingFields);

// POST route
router.route("/").post(protect, checkPermission("settings.bookingFields.create"), createBookingField);

// PUT/DELETE routes
router.route("/:id")
    .put(protect, checkPermission("settings.bookingFields.edit"), updateBookingField)
    .delete(protect, checkPermission("settings.bookingFields.delete"), deleteBookingField);

router.patch("/reorder", protect, checkPermission("settings.bookingFields.reorder"), reorderBookingFields);

module.exports = router;
