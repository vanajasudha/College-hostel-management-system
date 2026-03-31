const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");

// GET global admin/system notifications
router.get("/", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    db.query(`SELECT notification_id, student_id, title, message, type, is_read, created_at FROM notifications WHERE student_id IS NULL ORDER BY created_at DESC LIMIT 100`, (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.json(results);
    });
});

// PUT mark notification as read
router.put("/:id/read", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    db.query(`UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND student_id IS NULL`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Error updating notification", error: err.message });
        res.json({ message: "Notification marked as read" });
    });
});

// POST trigger global admin notification (Internal system hook)
router.post("/trigger", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message are required" });

    db.query(`INSERT INTO notifications (student_id, title, message, type, is_read) VALUES (NULL, ?, ?, 'general', FALSE)`, [title, message], (err) => {
        if (err) return res.status(500).json({ message: "Error logging notification", error: err.message });
        res.json({ message: "System alert registered." });
    });
});

module.exports = router;
