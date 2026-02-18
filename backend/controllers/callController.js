// controllers/callController.js
const path = require('path');
const jwt = require('jsonwebtoken');
const CallTask = require('../models/CallTask');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');

const safeToString = (v) => (v == null ? '' : String(v));

/**
 * POST /api/v1/calls/tasks
 * body: { leadId, phoneNumber }
 * Caller creates a task for THEMSELVES (or admin could set req.body.callerId to target someone else).
 */
exports.createTask = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { leadId, phoneNumber, callerId: overrideCallerId } = req.body;

    if (!leadId || !phoneNumber) {
      return res.status(400).json({ error: 'leadId and phoneNumber are required' });
    }

    // If caller is not admin, they must own the lead
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!req.user.isSystemAdmin && req.user.roleName?.toLowerCase() !== 'admin' && String(lead.assignedTo) !== String(callerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const isAdminUser = req.user.isSystemAdmin || req.user.roleName?.toLowerCase() === 'admin';
    const targetCallerId = overrideCallerId && isAdminUser ? overrideCallerId : callerId;

    const task = await CallTask.create({
      lead: lead._id,
      caller: targetCallerId,
      phoneNumber: safeToString(phoneNumber),
      status: 'pending',
    });

    const io = req.app.get('io');
    if (io) {
      // emit to the mobile app room
      io.to(`caller:${targetCallerId}`).emit('call:request', {
        taskId: String(task._id),
        leadId: String(lead._id),
        phoneNumber: task.phoneNumber,
        createdAt: task.createdAt,
      });
      await CallTask.updateOne({ _id: task._id }, { $set: { status: 'sent', sentAt: new Date() } });
    }

    res.status(201).json({ message: 'Task created', taskId: task._id });
  } catch (e) {
    console.error('createTask error:', e);
    res.status(500).json({ error: 'Failed to create call task' });
  }
};

/**
 * GET /api/v1/calls/tasks/pending
 * Mobile polls its pending tasks (in case sockets missed).
 */
exports.getMyPendingTasks = async (req, res) => {
  try {
    const callerId = req.user._id;
    const tasks = await CallTask.find({
      caller: callerId,
      status: { $in: ['pending', 'sent'] },
    }).sort({ createdAt: -1 }).limit(25);

    res.json({
      count: tasks.length,
      data: tasks.map(t => ({
        taskId: t._id,
        leadId: t.lead,
        phoneNumber: t.phoneNumber,
        status: t.status,
        createdAt: t.createdAt,
        sentAt: t.sentAt,
      })),
    });
  } catch (e) {
    console.error('getMyPendingTasks error:', e);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * PATCH /api/v1/calls/tasks/:taskId/ack
 * body: { deviceInfo? }
 */
exports.ackTask = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { taskId } = req.params;
    const { deviceInfo } = req.body || {};

    const task = await CallTask.findOne({ _id: taskId, caller: callerId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = 'in_progress';
    task.ackAt = new Date();
    if (deviceInfo) task.deviceInfo = deviceInfo;
    await task.save();

    res.json({ message: 'Task acknowledged' });
  } catch (e) {
    console.error('ackTask error:', e);
    res.status(500).json({ error: 'Failed to ack task' });
  }
};

/**
 * PATCH /api/v1/calls/tasks/:taskId/complete
 * body: { startedAt, endedAt, durationSec, outcome, notes }
 * Also writes to lead logs + activity stream.
 */
exports.completeTask = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { taskId } = req.params;
    const { startedAt, endedAt, durationSec = 0, outcome = '', notes = '' } = req.body || {};

    const task = await CallTask.findOne({ _id: taskId, caller: callerId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.startedAt = startedAt ? new Date(startedAt) : (task.startedAt || new Date());
    task.endedAt = endedAt ? new Date(endedAt) : new Date();
    task.durationSec = Number(durationSec) || 0;
    task.outcome = outcome;
    task.notes = notes;
    task.status = 'completed';
    await task.save();

    // Update the lead aggregates similar to callerController.logCall
    const lead = await Lead.findById(task.lead);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    // Task ownership already verified above (task.caller === callerId).
    // Lead may be assigned to a different user when admin dispatches the task,
    // so we skip the lead.assignedTo check here.

    const before = { status: lead.status, followUpAt: lead.followUpAt };
    lead.callCount = (lead.callCount || 0) + 1;
    lead.lastCallAt = new Date();
    lead.lastCallOutcome = outcome;

    // status transition heuristics
    if (outcome === 'connected') lead.status = 'contacted';
    if (outcome === 'interested') lead.status = 'interested';
    if (outcome === 'not_interested') lead.status = 'not_interested';
    if (outcome === 'converted') lead.status = 'converted';
    if (['no_answer', 'busy', 'switched_off', 'callback', 'voicemail'].includes(outcome)) {
      lead.status = lead.status === 'new' ? 'in_progress' : lead.status;
    }

    await lead.save();

    await LeadActivity.create({
      lead: lead._id,
      actor: callerId,
      action: 'call_logged',
      description: `Call via mobile: outcome=${outcome}, duration=${task.durationSec}s`,
      diff: { before, after: { status: lead.status, followUpAt: lead.followUpAt } },
      meta: { callTaskId: String(task._id), phoneNumber: task.phoneNumber },
    });

    // --- NEW: Create CallLog entry so dashboard stats work ---
    const log = await CallLog.create({
      lead: lead._id,
      caller: callerId,
      durationSec: task.durationSec,
      outcome: outcome,
      notes: notes,
      recordingUrl: task.recordingPath || '', // if uploaded later, this might be empty now, but fine
      createdAt: task.endedAt // ensure it counts for the correct day
    });

    // --- NEW: Emit socket event so dashboard updates real-time ---
    const io = req.app.get('io');
    if (io) {
      const payload = {
        leadId: lead._id,
        call: {
          id: log._id,
          durationSec: task.durationSec,
          outcome,
          notes,
          recordingUrl: task.recordingPath,
          createdAt: log.createdAt
        },
        lead: {
          id: lead._id,
          status: lead.status,
          followUpAt: lead.followUpAt,
          callCount: lead.callCount,
          lastCallAt: lead.lastCallAt,
          lastCallOutcome: lead.lastCallOutcome,
        },
      };
      // Emitting to lead room and caller room manually since we don't have 'room' helper imported here
      io.to(`lead:${lead._id}`).emit('call:logged', payload);
      io.to(`caller:${callerId}`).emit('call:logged', payload);
    }

    res.json({ message: 'Task completed & call logged' });
  } catch (e) {
    console.error('completeTask error:', e);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

/**
 * GET /api/v1/calls/tasks
 * Caller list of recent tasks (for dashboard)
 */
exports.listMyTasks = async (req, res) => {
  try {
    const callerId = req.user._id;
    const tasks = await CallTask.find({ caller: callerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('lead', 'fieldData createdTime');

    res.json({
      count: tasks.length,
      data: tasks.map(t => ({
        id: t._id,
        leadId: t.lead?._id || t.lead,
        phoneNumber: t.phoneNumber,
        status: t.status,
        createdAt: t.createdAt,
        sentAt: t.sentAt,
        ackAt: t.ackAt,
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        durationSec: t.durationSec,
        outcome: t.outcome,
      })),
    });
  } catch (e) {
    console.error('listMyTasks error:', e);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
};

/**
 * POST /api/v1/calls/recordings/upload
 * Upload call recording audio file
 * body: FormData with recording file, taskId, leadId, duration, phoneNumber
 */
exports.uploadRecording = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { taskId, leadId, duration, phoneNumber } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    // Verify the task belongs to this caller
    const task = await CallTask.findOne({ _id: taskId, caller: callerId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../uploads/recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let filename;
    let fileSize;
    let targetPath;

    // Method 1: Base64-encoded recording in JSON body (from mobile app)
    if (req.body.recordingBase64) {
      const buffer = Buffer.from(req.body.recordingBase64, 'base64');
      filename = req.body.recordingFilename || `recording-${Date.now()}-${Math.round(Math.random() * 1E9)}.mp4`;
      targetPath = path.join(uploadDir, filename);
      fs.writeFileSync(targetPath, buffer);
      fileSize = buffer.length;
    } else {
      // Method 2: FormData file upload (multer or express-fileupload)
      let file = req.file;
      if (!file && req.files && req.files.recording) {
        file = req.files.recording;
      }

      if (!file) {
        return res.status(400).json({ error: 'No recording file provided' });
      }

      const ext = path.extname(file.name || file.originalname || '.mp4');
      filename = `recording-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      targetPath = path.join(uploadDir, filename);
      fileSize = file.size;

      if (file.mv) {
        await file.mv(targetPath);
      } else if (file.path && file.path !== targetPath) {
        fs.renameSync(file.path, targetPath);
      }
    }

    // Relative path for serving
    const servedPath = `uploads/recordings/${filename}`;

    // Store the file path in the task
    task.recordingPath = servedPath;
    task.recordingFilename = filename;
    task.recordingSize = fileSize;
    task.recordingDuration = Number(duration) || 0;
    task.recordingUploadedAt = new Date();
    await task.save();

    // Link recording to the most recent CallLog entry for this lead + caller
    if (leadId) {
      try {
        const recentLog = await CallLog.findOne({
          lead: leadId,
          caller: callerId,
        }).sort({ createdAt: -1 });

        if (recentLog && !recentLog.recordingUrl) {
          recentLog.recordingUrl = servedPath;
          await recentLog.save();
          console.log(`Linked recording to CallLog ${recentLog._id}`);
        }
      } catch (linkErr) {
        console.warn('Failed to link recording to CallLog:', linkErr.message);
      }
    }

    // Create activity log for the recording
    if (leadId) {
      await LeadActivity.create({
        lead: leadId,
        actor: callerId,
        action: 'recording_uploaded',
        description: `Call recording uploaded (${Math.round(fileSize / 1024)}KB, ${duration}s)`,
        meta: {
          callTaskId: String(task._id),
          phoneNumber,
          recordingPath: servedPath,
          recordingFilename: filename,
          recordingSize: fileSize,
          duration: Number(duration),
        },
      });
    }

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      data: {
        taskId: task._id,
        recordingPath: servedPath,
        recordingSize: fileSize,
        duration: Number(duration),
      },
    });
  } catch (e) {
    console.error('uploadRecording error:', e);
    console.error('Error stack:', e.stack);
    res.status(500).json({ error: 'Failed to upload recording', details: e.message });
  }
};

