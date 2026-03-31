const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  WARDEN: Payment Summary Dashboard
*/
router.get("/summary", auth, role("Warden"), (req, res) => {
  const hostel_id = req.user.hostel_id;
  if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

    // Step 2: Total collection
    const totalQuery = `
      SELECT SUM(p.amount) AS total_collection
      FROM payment p
      JOIN student s ON p.student_id = s.student_id
      WHERE s.hostel_id = ?
    `;

    db.query(totalQuery, [hostel_id], (err, totalResult) => {
      if (err) return res.status(500).json(err);

      // Step 3: Monthly summary
      const monthlyQuery = `
        SELECT payment_month, SUM(amount) AS total
        FROM payment p
        JOIN student s ON p.student_id = s.student_id
        WHERE s.hostel_id = ?
        GROUP BY payment_month
      `;

      db.query(monthlyQuery, [hostel_id], (err, monthlyResult) => {
        if (err) return res.status(500).json(err);

        res.json({
          total_collection: totalResult[0].total_collection || 0,
          monthly_summary: monthlyResult,
        });
      });
    });
});

/*
  WARDEN: Generate Mapped Dues precisely checking previous assignments
*/
router.post('/generate-dues', auth, role('Warden'), (req, res) => {
    const { month, year, category, amount } = req.body;
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment" });
    if (!month || !year || !category || !amount) return res.status(400).json({ message: "Missing required fields" });

    db.query("SELECT student_id FROM student WHERE hostel_id = ?", [hostel_id], (err, students) => {
        if (err) return res.status(500).json(err);
        if (students.length === 0) return res.json({ message: "No students in hostel" });

        db.query("SELECT student_id FROM dues WHERE month = ? AND year = ? AND category = ?", [month, year, category], (e, existing) => {
            if (e) return res.status(500).json(e);
            
            const existingSet = new Set(existing.map(r => r.student_id));
            const newDues = students
                .filter(s => !existingSet.has(s.student_id))
                .map(s => [s.student_id, month, year, category, amount, 'unpaid']);
            
            if (newDues.length === 0) return res.json({ message: "Dues already generated for all students this period." });

            db.query("INSERT INTO dues (student_id, month, year, category, amount, status) VALUES ?", [newDues], (insE, r) => {
                if (insE) return res.status(500).json(insE);
                
                const notifMsg = `New due generated: ${category} for ${month} ${year} (₹${amount})`;
                const notifs = newDues.map(d => [d[0], notifMsg]);
                db.query(`INSERT INTO notifications (student_id, message) VALUES ?`, [notifs]);

                res.json({ message: `Generated dues for ${r.affectedRows} students.` });
            });
        });
    });
});

/*
  WARDEN: Retrieve Unpaid Students specifically joining new Dues Table
*/
router.get("/unpaid-students", auth, role("Warden"), (req, res) => {
  const hostel_id = req.user.hostel_id;
  if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

    const unpaidQuery = `
      SELECT s.student_id, s.name, s.roll_number, r.room_number, d.month, d.year, d.category, d.amount 
      FROM dues d
      JOIN student s ON s.student_id = d.student_id
      LEFT JOIN room r ON s.room_id = r.room_id
      WHERE s.hostel_id = ? AND d.status = 'unpaid'
      ORDER BY s.name ASC, d.year DESC, d.month DESC
    `;

    db.query(unpaidQuery, [hostel_id], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
});

module.exports = router;