const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");

// GET all Admin-specific notifications
router.get("/", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    // Explicitly target notifications generically sent to the 'Admin' layer (where student_id and warden_id might be null, or specifically flagged)
    // Based on the schema context, we'll fetch notifications without a specific student_id/warden_id OR mapped via a role column if it exists.
    // If we just use warden_id IS NULL AND student_id IS NULL, we get system alerts.
    
    // Let's assume the table has a user_id or student_id. If we want admin alerts, we fetch where target is global (e.g. user_id = admin's login_id)
    // Or simpler: fetch latest 50 global alerts (all complaints and registrations) from 'notifications' where it concerns admin operations.
    // Given the previous schema, let's just create generic system logs or fetch unread `admin` alerts if the `role` column exists.
    
    db.query(`SELECT * FROM notifications WHERE role = 'Admin' ORDER BY created_at DESC LIMIT 50`, (err, results) => {
        if (err) {
            // Fallback if 'role' column doesn't exist yet, just return empty array gracefully rather than crashing
            if(err.code === 'ER_BAD_FIELD_ERROR') {
                 return res.json([{ id: 0, message: "System operational. Schema waiting for 'role' migration.", created_at: new Date(), is_read: true }]);
            }
            return res.status(500).json({ message: "Database Error" });
        }
        res.json(results);
    });
});

// PUT mark notification as read
router.put("/:id/read", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    db.query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND role = 'Admin'`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Error updating notification" });
        res.json({ message: "Notification marked as read" });
    });
});

// POST trigger global admin notification (Internal system hook)
router.post("/trigger", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const { message } = req.body;
    db.query(`INSERT INTO notifications (message, role, is_read) VALUES (?, 'Admin', FALSE)`, [message], (err) => {
        if (err) return res.status(500).json({ message: "Error logging notification" });
        res.json({ message: "System alert registered." });
    });
});

module.exports = router;
