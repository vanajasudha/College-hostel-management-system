const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  WARDEN: Complaint Analytics Dashboard
*/
router.get("/", auth, role("Warden"), (req, res) => {
  const hostel_id = req.user.hostel_id;
  if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

    // Step 2: Total complaints
    const totalQuery = `
      SELECT COUNT(*) AS total_complaints
      FROM complaint c
      JOIN student s ON c.student_id = s.student_id
      WHERE s.hostel_id = ?
    `;

    db.query(totalQuery, [hostel_id], (err, total) => {
      if (err) return res.status(500).json(err);

      // Step 3: Pending complaints
      const pendingQuery = `
        SELECT COUNT(*) AS pending
        FROM complaint c
        JOIN student s ON c.student_id = s.student_id
        WHERE s.hostel_id = ? AND c.status = 'Pending'
      `;

      db.query(pendingQuery, [hostel_id], (err, pending) => {
        if (err) return res.status(500).json(err);

        // Step 4: Resolved complaints
        const resolvedQuery = `
          SELECT COUNT(*) AS resolved
          FROM complaint c
          JOIN student s ON c.student_id = s.student_id
          WHERE s.hostel_id = ? AND c.status = 'Resolved'
        `;

        db.query(resolvedQuery, [hostel_id], (err, resolved) => {
          if (err) return res.status(500).json(err);

          // Step 5: Monthly complaint trends (FIXED GROUP BY)
          const monthlyQuery = `
            SELECT 
              MONTHNAME(c.complaint_date) AS month,
              COUNT(*) AS total
            FROM complaint c
            JOIN student s ON c.student_id = s.student_id
            WHERE s.hostel_id = ?
            GROUP BY MONTH(c.complaint_date), MONTHNAME(c.complaint_date)
            ORDER BY MONTH(c.complaint_date)
          `;

          db.query(monthlyQuery, [hostel_id], (err, monthly) => {
            if (err) return res.status(500).json(err);

            res.json({
              total_complaints: total[0].total_complaints,
              pending: pending[0].pending,
              resolved: resolved[0].resolved,
              monthly_trends: monthly,
            });
          });
        });
      });
    });
});

module.exports = router;