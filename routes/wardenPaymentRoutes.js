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
  WARDEN: Generate per-student dues with fixed categories (hostel + electricity)
*/
router.post('/generate-dues', auth, role('Warden'), (req, res) => {
    const { month, year, hostel_fee, electricity_fee } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!hostel_id) return res.status(403).json({ message: 'No active hostel assignment' });
    if (!month || !year || hostel_fee == null || electricity_fee == null) {
      return res.status(400).json({ message: 'month, year, hostel_fee, and electricity_fee are required' });
    }

    const hostelFee = Number(hostel_fee);
    const elecFee = Number(electricity_fee);
    if (isNaN(hostelFee) || isNaN(elecFee) || hostelFee < 0 || elecFee < 0) {
      return res.status(400).json({ message: 'Fees must be valid positive numbers' });
    }

    // Calculate due date (10th of the month)
    const monthNumber = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
    }[month];
    const dueDate = `${year}-${monthNumber}-10`;

    db.query('SELECT student_id FROM student WHERE hostel_id = ?', [hostel_id], (err, students) => {
      if (err) return res.status(500).json({ message: 'Failed to load hostel students', error: err.message });
      if (!students.length) return res.status(404).json({ message: 'No students found in this hostel' });

      const studentIds = students.map(s => s.student_id);

      // Use WHERE NOT EXISTS to prevent duplicates
      const insertQuery = `
        INSERT INTO dues (student_id, month, year, category, amount, status, due_date)
        SELECT s.student_id, ?, ?, 'hostel', ?, 'unpaid', ?
        FROM student s
        WHERE s.hostel_id = ? AND s.student_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM dues d
          WHERE d.student_id = s.student_id
          AND d.month = ?
          AND d.year = ?
          AND d.category = 'hostel'
        )
        UNION ALL
        SELECT s.student_id, ?, ?, 'electricity', ?, 'unpaid', ?
        FROM student s
        WHERE s.hostel_id = ? AND s.student_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM dues d
          WHERE d.student_id = s.student_id
          AND d.month = ?
          AND d.year = ?
          AND d.category = 'electricity'
        )
      `;

      // Execute for each student
      const promises = studentIds.map(studentId => {
        return new Promise((resolve, reject) => {
          const params = [
            month, year, hostelFee, dueDate, hostel_id, studentId, month, year,
            month, year, elecFee, dueDate, hostel_id, studentId, month, year
          ];

          db.query(insertQuery, params, (insErr, insResult) => {
            if (insErr) return reject(insErr);
            resolve(insResult.affectedRows);
          });
        });
      });

      Promise.all(promises).then(results => {
        const totalInserted = results.reduce((sum, count) => sum + count, 0);

        if (totalInserted === 0) {
          return res.json({ message: 'No new dues created; all students already have dues for that period.' });
        }

        const total_amount = (hostelFee + elecFee) * (totalInserted / 2); // Divide by 2 since we insert 2 records per student

        // Send notifications only to students who got new dues
        const notifPromises = students.map(s => {
          const message = `New due generated for ${month} ${year}: ₹${hostelFee + elecFee} (Hostel: ₹${hostelFee}, Electricity: ₹${elecFee}). Due date: ${dueDate}`;
          return require('../utils/notificationService').createNotification({
            student_id: s.student_id,
            title: 'New dues generated',
            message,
            type: 'fee'
          }).catch(err => {
            console.error(`[WARDEN DUES] Notification failed for student ${s.student_id}:`, err.message);
            return { created: false, error: err.message }; // Return success object to prevent Promise.all rejection
          });
        });

        Promise.all(notifPromises).then((notifResults) => {
          const failedNotifications = notifResults.filter(r => r.created === false).length;
          const successMessage = `Generated dues for ${totalInserted / 2} students.`;
          const fullMessage = failedNotifications > 0 ? `${successMessage} (${failedNotifications} notifications failed)` : successMessage;

          res.json({
            message: fullMessage,
            period: `${month} ${year}`,
            total_amount,
            hostel_fee: hostelFee,
            electricity_fee: elecFee,
            due_date: dueDate,
            records_created: totalInserted,
            notifications_sent: notifResults.filter(r => r.created === true).length,
            notifications_failed: failedNotifications
          });
        }).catch(notifErr => {
          console.error('[WARDEN DUES] Unexpected notification error:', notifErr);
          // Still return success for dues creation
          res.json({
            message: `Generated dues for ${totalInserted / 2} students. (Notifications failed unexpectedly)`,
            period: `${month} ${year}`,
            total_amount,
            hostel_fee: hostelFee,
            electricity_fee: elecFee,
            due_date: dueDate,
            records_created: totalInserted,
            notification_error: notifErr.message
          });
        });

      }).catch(err => {
        console.error('[Warden Generate Dues] Error:', err);
        res.status(500).json({ message: 'Failed creating dues', error: err.message });
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
      SELECT s.student_id, s.name, s.roll_number, r.room_number,
             d.month, d.year, SUM(d.amount) as total_amount,
             CASE WHEN SUM(CASE WHEN d.status IN ('unpaid', 'overdue') THEN 1 ELSE 0 END) > 0 THEN
               CASE WHEN SUM(CASE WHEN d.status = 'overdue' THEN 1 ELSE 0 END) > 0 THEN 'overdue' ELSE 'unpaid' END
             ELSE 'paid' END as status,
             d.due_date
      FROM dues d
      JOIN student s ON s.student_id = d.student_id
      LEFT JOIN room r ON s.room_id = r.room_id
      WHERE s.hostel_id = ? AND d.status IN ('unpaid', 'overdue')
      GROUP BY s.student_id, s.name, s.roll_number, r.room_number, d.month, d.year, d.due_date
      ORDER BY s.name ASC, FIELD(d.month, 'January','February','March','April','May','June','July','August','September','October','November','December')
    `;

    db.query(unpaidQuery, [hostel_id], (err, result) => {
      if (err) {
        console.error("[Warden Payments] Unpaid students query error:", err);
        return res.status(500).json({ message: "Failed to retrieve unpaid students" });
      }
      res.json(result || []);
    });
});

/*
  WARDEN: All payments for hostel students
*/
router.get("/all", auth, role("Warden"), (req, res) => {
  const hostel_id = req.user.hostel_id;
  if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

  const query = `
    SELECT p.transaction_id, s.name AS student_name, p.category,
           p.amount, p.method, p.status, p.payment_date
    FROM payment p
    JOIN student s ON p.student_id = s.student_id
    WHERE s.hostel_id = ?
    ORDER BY p.payment_date DESC
    LIMIT 2000
  `;

  db.query(query, [hostel_id], (err, result) => {
    if (err) {
      console.error("[Warden All Payments] Query error:", err);
      return res.status(500).json({ message: "Failed to retrieve payments" });
    }
    res.json(result || []);
  });
});

module.exports = router;