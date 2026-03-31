const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");

// GET all dues globally (with optional hostel_id filter)
router.get("/dues", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const hostel_id = req.query.hostel_id;
    let query = `
        SELECT d.*, s.name, s.roll_number, h.name as hostel_name 
        FROM dues d
        JOIN student s ON d.student_id = s.student_id
        JOIN hostel h ON s.hostel_id = h.hostel_id
    `;
    const params = [];

    if (hostel_id && hostel_id !== 'all') {
        query += ` WHERE s.hostel_id = ?`;
        params.push(hostel_id);
    }
    query += ` ORDER BY d.year DESC, FIELD(d.month, 'December','November','October','September','August','July','June','May','April','March','February','January') DESC`;

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching global dues." });
        res.json(results);
    });
});

// POST Generate Massive Dues Block (Globally or by Hostel)
router.post("/generate", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const { month, year, category, amount, hostel_id } = req.body;
    if (!month || !year || !category || !amount) {
        return res.status(400).json({ message: "Missing required due generation parameters." });
    }

    let targetQuery = `SELECT student_id FROM student`;
    const params = [];
    if (hostel_id && hostel_id !== 'all') {
        targetQuery += ` WHERE hostel_id = ?`;
        params.push(hostel_id);
    }

    db.query(targetQuery, params, (err, students) => {
        if (err) return res.status(500).json({ message: "Failed fetching student targets." });
        if (students.length === 0) return res.status(400).json({ message: "No active students found in specified parameters." });

        const values = students.map(s => [s.student_id, month, year, category, amount, 'unpaid']);
        const insertQuery = `INSERT IGNORE INTO dues (student_id, month, year, category, amount, status) VALUES ?`;

        db.query(insertQuery, [values], (err2, result) => {
            if (err2) return res.status(500).json({ message: "Failed writing Master Dues map.", error: err2.message });

            // Send Notifications globally
            const notifVals = students.map(s => [s.student_id, `New Invoice: ${category} for ${month} ${year} amounting to ₹${amount} is generated.`]);
            db.query(`INSERT INTO notifications (student_id, message) VALUES ?`, [notifVals], () => {
                res.json({ message: `Dues successfully deployed to ${result.affectedRows} students.` });
            });
        });
    });
});

module.exports = router;
