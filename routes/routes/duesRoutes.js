/**
 * DUES ROUTES
 *
 * Manages student fee dues and payment tracking.
 * Supports monthly dues with multiple categories (rent, utilities, etc.).
 *
 * Endpoints:
 * - GET /api/dues/student/dues - Student's own dues (Student only)
 * - GET /api/dues/dues/:studentId - Specific student's dues (Admin/Warden/Student)
 * - GET /api/dues/due/:studentId/:month/:year - Single due details
 * - PUT /api/dues/dues/:studentId/:month/:year - Update due status (Warden/Admin)
 *
 * Dues Structure:
 * - Grouped by student_id, month, year
 * - Multiple categories per month (rent, electricity, water, etc.)
 * - Status: paid/unpaid
 * - Automatic notifications on updates
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control
const notifService = require("../utils/notificationService"); // Notification service

// MONTH ORDERING FOR SORTING
// Ensures months are sorted chronologically (Jan-Dec) not alphabetically
const orderMonth = "FIELD(month, 'January','February','March','April','May','June','July','August','September','October','November','December')";

/**
 * DUES GROUPING HELPER FUNCTION
 * Groups individual due items into monthly dues with totals.
 *
 * Input: Array of individual due records
 * Output: Array of grouped dues by student/month/year
 *
 * Each group contains:
 * - student_id, month, year
 * - total_amount: Sum of all items
 * - status: 'paid' if all items paid, 'unpaid' if any unpaid
 * - items: Array of individual due items
 */
const attachDueItems = (dues, callback) => {
  if (!dues.length) return callback(null, []);

  // GROUP DUES BY STUDENT/MONTH/YEAR
  const grouped = {};
  dues.forEach(row => {
    const key = `${row.student_id}-${row.month}-${row.year}`;
    if (!grouped[key]) {
      grouped[key] = {
        student_id: row.student_id,
        month: row.month,
        year: row.year,
        total_amount: 0,
        status: 'paid',
        items: []
      };
    }
    // ADD ITEM TO GROUP
    grouped[key].items.push({
      id: row.id,
      category: row.category,
      amount: Number(row.amount)
    });
    // UPDATE TOTALS
    grouped[key].total_amount += Number(row.amount);
    if (row.status === 'unpaid') grouped[key].status = 'unpaid';
  });

  callback(null, Object.values(grouped));
};

/**
 * STUDENT DUES ENDPOINT
 * GET /api/dues/student/dues
 *
 * Returns all dues for the authenticated student.
 * Groups individual items into monthly dues.
 */
router.get("/student/dues", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;

  const query = `
    SELECT id, student_id, month, year, category, amount, status
    FROM dues
    WHERE student_id = ?
    ORDER BY year DESC, ${orderMonth}
  `;

  db.query(query, [student_id], (err, dues) => {
    if (err) {
      console.error("[Dues] Student dues query error:", err);
      return res.status(500).json({ message: "Failed to retrieve dues" });
    }

    // GROUP AND FORMAT DUES
    attachDueItems(dues, (itemsErr, result) => {
      if (itemsErr) return res.status(500).json({ message: itemsErr.message });
      res.json(result);
    });
  });
});

/**
 * SPECIFIC STUDENT DUES ENDPOINT
 * GET /api/dues/dues/:studentId
 *
 * Returns dues for a specific student.
 * Access control: Students can only see their own, Wardens/Admins see any.
 */
router.get("/dues/:studentId", auth, (req, res) => {
  const student_id = Number(req.params.studentId);
  if (isNaN(student_id)) return res.status(400).json({ message: "Invalid studentId." });

  if (req.user.role === "Student" && req.user.reference_id !== student_id) {
    return res.status(403).json({ message: "You can only retrieve your own dues" });
  }

  const query = `
    SELECT id, student_id, month, year, category, amount, status
    FROM dues
    WHERE student_id = ?
    ORDER BY year DESC, ${orderMonth}
  `;

  db.query(query, [student_id], (err, dues) => {
    if (err) return res.status(500).json({ message: err.message });
    attachDueItems(dues, (itemsErr, result) => {
      if (itemsErr) return res.status(500).json({ message: itemsErr.message });
      res.json(result);
    });
  });
});

/**
 * SINGLE DUE DETAILS ENDPOINT
 * GET /api/dues/due/:studentId/:month/:year
 *
 * Returns detailed breakdown of a specific month's dues.
 * Includes all categories and their individual amounts.
 */
router.get("/due/:studentId/:month/:year", auth, (req, res) => {
  const student_id = Number(req.params.studentId);
  const month = req.params.month;
  const year = Number(req.params.year);

  if (isNaN(student_id) || isNaN(year)) return res.status(400).json({ message: "Invalid parameters." });

  if (req.user.role === "Student" && req.user.reference_id !== student_id) {
    return res.status(403).json({ message: "You can only retrieve your own dues" });
  }

  const query = `
    SELECT id, student_id, month, year, category, amount, status
    FROM dues
    WHERE student_id = ? AND month = ? AND year = ?
    ORDER BY category
  `;

  db.query(query, [student_id, month, year], (err, dues) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!dues.length) return res.status(404).json({ message: "Due not found." });

    const total_amount = dues.reduce((sum, d) => sum + Number(d.amount), 0);
    const status = dues.some(d => d.status === 'unpaid') ? 'unpaid' : 'paid';
    const items = dues.map(d => ({ id: d.id, category: d.category, amount: Number(d.amount) }));

    res.json({ student_id, month, year, total_amount, status, items });
  });
});

/**
 * UPDATE DUES STATUS ENDPOINT
 * PUT /api/dues/dues/:studentId/:month/:year
 *
 * Updates the payment status of a student's monthly dues.
 * Restricted to Wardens (own hostel) and Admins (all hostels).
 *
 * Features:
 * - Hostel-based access control for wardens
 * - Automatic notification to student
 * - Status validation (paid/unpaid only)
 */
router.put("/dues/:studentId/:month/:year", auth, role("Warden", "Admin"), (req, res) => {
  const student_id = Number(req.params.studentId);
  const month = req.params.month;
  const year = Number(req.params.year);

  if (isNaN(student_id) || isNaN(year)) return res.status(400).json({ message: "Invalid parameters." });

  const { status, items } = req.body;

  if (req.user.role === 'Warden') {
    // Check if student is in warden's hostel
    db.query('SELECT s.student_id FROM student s WHERE s.student_id = ? AND s.hostel_id = ?', [student_id, req.user.hostel_id], (err, stuRes) => {
      if (err || !stuRes.length) return res.status(403).json({ message: 'Student not in your hostel' });
      proceedUpdate();
    });
  } else {
    proceedUpdate();
  }

  function proceedUpdate() {
    if (status && ['paid', 'unpaid'].includes(status)) {
      db.query('UPDATE dues SET status = ? WHERE student_id = ? AND month = ? AND year = ?', [status, student_id, month, year], (updateErr) => {
        if (updateErr) return res.status(500).json({ message: updateErr.message });
        sendEditNotification();
      });
    } else {
      sendEditNotification();
    }

    function sendEditNotification() {
      notifService.createNotification({
        student_id,
        title: 'Dues updated',
        message: `Your dues for ${month} ${year} have been updated`,
        type: 'fee'
      }).catch(e => console.error('Notification error', e.message));
      res.json({ message: 'Due updated successfully' });
    }
  }
});

// EXPORT ROUTER
// Makes dues routes available for mounting in main server.js
module.exports = router;
