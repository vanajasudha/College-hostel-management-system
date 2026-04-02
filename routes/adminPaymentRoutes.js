const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const notifService = require("../utils/notificationService");

// GET all dues globally (with optional hostel_id filter)
router.get("/dues", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const hostel_id = req.query.hostel_id;
    let query = `
        SELECT s.student_id, s.name, s.roll_number, h.name as hostel_name,
               d.month, d.year, SUM(d.amount) as total_amount,
               CASE WHEN SUM(CASE WHEN d.status = 'unpaid' THEN 1 ELSE 0 END) > 0 THEN 'unpaid' ELSE 'paid' END as status
        FROM dues d
        JOIN student s ON d.student_id = s.student_id
        JOIN hostel h ON s.hostel_id = h.hostel_id
    `;
    const params = [];

    if (hostel_id && hostel_id !== 'all') {
        query += ` WHERE s.hostel_id = ?`;
        params.push(hostel_id);
    }
    query += ` GROUP BY s.student_id, s.name, s.roll_number, h.name, d.month, d.year
               ORDER BY FIELD(d.month, 'December','November','October','September','August','July','June','May','April','March','February','January') DESC`;

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching global dues." });
        res.json(results);
    });
});

// POST Generate Massive Dues Block (Globally or by Hostel)
router.post("/generate", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const { month, year, hostel_fee, electricity_fee, hostel_id } = req.body;
    if (!month || !year || hostel_fee == null || electricity_fee == null) {
        return res.status(400).json({ message: "month, year, hostel_fee, and electricity_fee are required." });
    }

    const hostelFee = Number(hostel_fee);
    const elecFee = Number(electricity_fee);
    if (isNaN(hostelFee) || isNaN(elecFee) || hostelFee < 0 || elecFee < 0) {
      return res.status(400).json({ message: 'Fees must be valid positive numbers' });
    }

    const total_amount = hostelFee + elecFee;

    let targetQuery = `SELECT student_id FROM student`;
    const params = [];
    if (hostel_id && hostel_id !== 'all') {
        targetQuery += ` WHERE hostel_id = ?`;
        params.push(hostel_id);
    }

    db.query(targetQuery, params, (err, students) => {
        if (err) return res.status(500).json({ message: "Failed fetching student targets." });
        if (students.length === 0) return res.status(400).json({ message: "No active students found in specified parameters." });

        const studentIds = students.map(s => s.student_id);
        const existsQuery = `SELECT student_id FROM dues WHERE month = ? AND year = ? AND student_id IN (${studentIds.map(() => '?').join(',')})`;
        const existsParams = [month, year, ...studentIds];

        db.query(existsQuery, existsParams, (existsErr, existing) => {
            if (existsErr) return res.status(500).json({ message: 'Duplicate check failed', error: existsErr.message });

            const existingSet = new Set(existing.map(r => r.student_id));
            const newStudents = students.filter(s => !existingSet.has(s.student_id));

            if (newStudents.length === 0) {
              return res.json({ message: 'No new dues created; all students already have dues this month/year.' });
            }

            const values = [];
            newStudents.forEach(s => {
              values.push([s.student_id, month, year, 'hostel', hostelFee, 'unpaid']);
              values.push([s.student_id, month, year, 'electricity', elecFee, 'unpaid']);
            });

            db.query('INSERT INTO dues (student_id, month, year, category, amount, status) VALUES ?', [values], (err2, result) => {
                if (err2) return res.status(500).json({ message: "Failed writing dues.", error: err2.message });

                // Send Notifications globally (no duplicates)
                const sendPromises = newStudents.map((s) => {
                    const message = `New due generated for ${month} ${year}: ₹${total_amount} (Hostel: ₹${hostelFee}, Electricity: ₹${elecFee}).`;
                    return notifService.createNotification({
                        student_id: s.student_id,
                        title: "New Pending Dues",
                        message,
                        type: "fee"
                    }).catch((e) => {
                        console.error("[ADMIN DUES] Fee notification error for student", s.student_id, e.message);
                        return { created: false, error: e.message }; // Return object to prevent Promise.all rejection
                    });
                });

                Promise.all(sendPromises)
                    .then((notifResults) => {
                        const failedNotifications = notifResults.filter(r => r.created === false).length;
                        const successMessage = `Dues successfully deployed to ${newStudents.length} students.`;
                        const fullMessage = failedNotifications > 0 ? `${successMessage} (${failedNotifications} notifications failed)` : successMessage;

                        res.json({
                            message: fullMessage,
                            students_affected: newStudents.length,
                            records_created: result.affectedRows,
                            notifications_sent: notifResults.filter(r => r.created === true).length,
                            notifications_failed: failedNotifications
                        });
                    })
                    .catch((notifErr) => {
                        console.error('[ADMIN DUES] Unexpected notification error:', notifErr);
                        res.json({
                            message: `Dues deployed to ${newStudents.length} students. (Notifications failed unexpectedly)`,
                            students_affected: newStudents.length,
                            records_created: result.affectedRows,
                            notification_error: notifErr.message
                        });
                    });
            });
        });
    });
});

module.exports = router;
