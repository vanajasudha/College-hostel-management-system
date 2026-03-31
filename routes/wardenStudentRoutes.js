const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  WARDEN: Get Students in Warden's Hostel
*/
router.get("/", auth, role("Warden"), (req, res) => {
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

        // Step 2: Fetch students belonging to this hostel
        const studentsQuery = `
      SELECT s.student_id, s.name, s.phone, s.email, h.hostel_name, r.room_number
      FROM student s
      LEFT JOIN hostel h ON s.hostel_id = h.hostel_id
      LEFT JOIN room r ON s.room_id = r.room_id
      WHERE s.hostel_id = ?
      ORDER BY r.room_number, s.name
    `;

        db.query(studentsQuery, [hostel_id], (err, students) => {
            if (err) return res.status(500).json(err);
            res.json(students);
        });
});

/* WARDEN: Deep Dive into Specific Student */
router.get("/:id", auth, role("Warden"), (req, res) => {
    const hostel_id = req.user.hostel_id;
    const student_id = req.params.id;

    const baseQuery = `
      SELECT s.student_id, s.name, s.phone, s.email, h.hostel_name, r.room_number 
      FROM student s 
      LEFT JOIN hostel h ON s.hostel_id = h.hostel_id 
      LEFT JOIN room r ON s.room_id = r.room_id 
      WHERE s.student_id = ? AND s.hostel_id = ?
    `;

    db.query(baseQuery, [student_id, hostel_id], (err, stuRes) => {
        if (err || stuRes.length === 0) return res.status(404).json({ message: "Student not found or not in your hostel." });
        const student = stuRes[0];

        const duesQuery = new Promise((resolve) => {
            db.query(`SELECT month, year, category, amount, status FROM dues WHERE student_id = ? ORDER BY year DESC, month DESC`, [student_id], (e, r) => resolve(r || []));
        });

        const complaintsQuery = new Promise((resolve) => {
            db.query(`SELECT description, status, complaint_date, priority, assigned_to FROM complaint WHERE student_id = ? ORDER BY complaint_date DESC`, [student_id], (e, r) => resolve(r || []));
        });

        Promise.all([duesQuery, complaintsQuery]).then(([dues, complaints]) => {
            res.json({ ...student, dues, complaints });
        });
    });
});

module.exports = router;
