const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  ADMIN: Department-wise Complaint Analytics
*/
router.get("/", auth, role("Admin"), (req, res) => {
    const query = `
    SELECT 
      s.department,
      COUNT(c.complaint_id) AS total_complaints,
      SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
    FROM complaint c
    JOIN student s ON c.student_id = s.student_id
    GROUP BY s.department
    ORDER BY total_complaints DESC
  `;

    db.query(query, (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
});

router.get("/history", auth, role("Admin"), (req, res) => {
    const query = `
        SELECT c.complaint_id, s.name as student_name, h.hostel_name, r.room_number, c.description, c.status, c.complaint_date as date_submitted
        FROM complaint c
        JOIN student s ON c.student_id = s.student_id
        JOIN hostel h ON s.hostel_id = h.hostel_id
        LEFT JOIN room r ON s.room_id = r.room_id
        ORDER BY c.complaint_date DESC
        LIMIT 100
    `;
    db.query(query, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

console.log("Department analytics route loaded");

module.exports = router;