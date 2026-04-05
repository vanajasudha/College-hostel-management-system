const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

// GET /api/warden/notifications
router.get('/', auth, role('Warden'), (req, res) => {
    db.query("SELECT warden_id FROM warden WHERE employee_id = ?", [req.user.login_id], (err, wardenRes) => {
        if (err || wardenRes.length === 0) return res.status(403).json({ message: "Warden account error" });
        const warden_id = wardenRes[0].warden_id;

        const query = `SELECT * FROM notifications WHERE warden_id = ? ORDER BY created_at DESC LIMIT 50`;
        db.query(query, [warden_id], (e, results) => {
            if (e) return res.status(500).json({ message: e.message });
            res.json(results || []);
        });
    });
});

// PUT /api/warden/notifications/:id/read
router.put('/:id/read', auth, role('Warden'), (req, res) => {
    db.query("SELECT warden_id FROM warden WHERE employee_id = ?", [req.user.login_id], (err, wardenRes) => {
        if (err || wardenRes.length === 0) return res.status(403).json({ message: "Warden account error" });
        const warden_id = wardenRes[0].warden_id;
        const notif_id = req.params.id;

        const query = `UPDATE notifications SET is_read = TRUE WHERE id = ? AND warden_id = ?`;
        db.query(query, [notif_id, warden_id], (e) => {
            if (e) return res.status(500).json({ message: e.message });
            res.json({ message: "Notification read." });
        });
    });
});

module.exports = router;
