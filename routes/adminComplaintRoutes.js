const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");

// GET all complaints (Global tracking)
router.get("/", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const query = `
        SELECT c.*, s.name, s.phone, r.room_number, h.name as hostel_name 
        FROM complaint c
        JOIN student s ON c.student_id = s.student_id
        JOIN hostel h ON s.hostel_id = h.hostel_id
        LEFT JOIN room r ON c.room_number = r.room_number AND r.hostel_id = h.hostel_id
        ORDER BY FIELD(c.status, 'Pending') DESC, c.complaint_date DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching global complaints." });
        res.json(results);
    });
});

// PUT update any complaint globally
router.put("/:id", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const complaint_id = req.params.id;
    const { status, priority, assigned_to, remarks } = req.body;

    const query = `UPDATE complaint SET status = ?, priority = ?, assigned_to = ?, remarks = ? WHERE complaint_id = ?`;
    
    db.query(query, [status, priority, assigned_to, remarks, complaint_id], (err) => {
        if (err) return res.status(500).json({ message: "Failed replacing complaint constraints.", error: err.message });
        
        // Notify the student regarding change
        db.query(`SELECT student_id FROM complaint WHERE complaint_id = ?`, [complaint_id], (err2, res2) => {
            if (!err2 && res2.length > 0) {
                const sid = res2[0].student_id;
                db.query(`INSERT INTO notifications (student_id, message) VALUES (?, ?)`, 
                         [sid, `Your complaint #${complaint_id} was updated. Status: ${status}`]);
            }
            res.json({ message: "Master complaint successfully processed." });
        });
    });
});

// DELETE complaint (optional admin override)
router.delete("/:id", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    db.query(`DELETE FROM complaint WHERE complaint_id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Failed expunging complaint record." });
        res.json({ message: "Grievance Record permanently erased." });
    });
});

module.exports = router;
