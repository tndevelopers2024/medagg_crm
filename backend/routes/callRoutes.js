// routes/callRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const {
  createTask,
  getMyPendingTasks,
  ackTask,
  completeTask,
  listMyTasks,
  uploadRecording,
} = require('../controllers/callController');

// All routes require caller auth (admins can also create for others)
router.use(protect);

router.post('/tasks', checkPermission("leads.detail.calls"), createTask);                            // web -> create
router.get('/tasks/pending', checkPermission("leads.detail.calls"), getMyPendingTasks);              // mobile -> poll fallback
router.patch('/tasks/:taskId/ack', checkPermission("leads.detail.calls"), ackTask);                  // mobile -> ack
router.patch('/tasks/:taskId/complete', checkPermission("leads.detail.calls"), completeTask);        // mobile -> done(+log)
router.get('/tasks', checkPermission("leads.detail.calls"), listMyTasks);                            // caller dashboard list
router.post('/recordings/upload', checkPermission("leads.detail.calls"), uploadRecording);           // mobile -> upload recording (uses global fileUpload middleware)

module.exports = router;

