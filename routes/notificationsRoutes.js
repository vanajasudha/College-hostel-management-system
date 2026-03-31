const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const notifService = require('../utils/notificationService');

// GET /api/notifications/:student_id (or /api/notifications/me for current user)
router.get('/:student_id', auth, (req, res) => {
  const p = req.params.student_id;
  let studentId;

  if (p === 'me') {
    if (!req.user.reference_id) return res.status(400).json({ message: 'Student reference_id missing in token.' });
    studentId = req.user.reference_id;
  } else {
    studentId = Number(p);
  }

  if (req.user.role === 'Student' && studentId !== req.user.reference_id) {
    return res.status(403).json({ message: 'Students can only fetch their own notifications.' });
  }

  const query = `
    SELECT notification_id, student_id, title, message, type, is_read, created_at
    FROM notifications
    WHERE (student_id = ? OR student_id IS NULL)
    ORDER BY created_at DESC
    LIMIT 100
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching notifications', error: err.message });
    res.json(results);
  });
});

// GET unread count
router.get('/unread-count/:student_id', auth, (req, res) => {
  const studentId = Number(req.params.student_id === 'me' ? req.user.reference_id : req.params.student_id);
  if (req.user.role === 'Student' && studentId !== req.user.reference_id) return res.status(403).json({ message: 'Forbidden' });

  db.query(
    `SELECT COUNT(*) AS unreadCount FROM notifications WHERE (student_id = ? OR student_id IS NULL) AND is_read = FALSE`,
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Error fetching unread count', error: err.message });
      res.json({ unreadCount: rows[0]?.unreadCount || 0 });
    }
  );
});

// PUT mark as read
router.put('/read/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Notification id required' });

  // allow admin/warden to mark any, student only own
  const ownershipQuery = `SELECT student_id FROM notifications WHERE notification_id = ?`;
  db.query(ownershipQuery, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching notification', error: err.message });
    if (rows.length === 0) return res.status(404).json({ message: 'Notification not found' });

    const student_id = rows[0].student_id;
    if (req.user.role === 'Student' && student_id !== null && student_id !== req.user.reference_id) {
      return res.status(403).json({ message: 'You can only mark your own notifications.' });
    }

    db.query(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = ?`,
      [id],
      (err2) => {
        if (err2) return res.status(500).json({ message: 'Error updating notification', error: err2.message });
        res.json({ message: 'Notification marked as read' });
      }
    );
  });
});

// POST create notification (Admin)
router.post('/', auth, role('Admin'), async (req, res) => {
  try {
    const { student_id, title, message, type = 'general' } = req.body;

    if (!title || !message || !type) return res.status(400).json({ message: 'title, message and type are required' });

    const result = await notifService.createNotification({ student_id: student_id || null, title, message, type });
    const statusCode = result.created ? 201 : 200;
    res.status(statusCode).json({ message: result.created ? 'Notification created' : 'Notification already exists', ...result });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
});

module.exports = router;
