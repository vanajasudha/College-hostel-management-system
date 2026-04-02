const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const notifService = require("../utils/notificationService");

const orderMonth = "FIELD(month, 'January','February','March','April','May','June','July','August','September','October','November','December')";

const attachDueItems = (dues, callback) => {
  if (!dues.length) return callback(null, []);
  // Since each row is an item, group them
  const grouped = {};
  dues.forEach(row => {
    const key = `${row.student_id}-${row.month}-${row.year}`;
    if (!grouped[key]) {
      grouped[key] = { student_id: row.student_id, month: row.month, year: row.year, total_amount: 0, status: 'paid', items: [] };
    }
    grouped[key].items.push({ id: row.id, category: row.category, amount: Number(row.amount) });
    grouped[key].total_amount += Number(row.amount);
    if (row.status === 'unpaid') grouped[key].status = 'unpaid';
  });
  callback(null, Object.values(grouped));
};

// Student-specific dues (all statuses)
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
    attachDueItems(dues, (itemsErr, result) => {
      if (itemsErr) return res.status(500).json({ message: itemsErr.message });
      res.json(result);
    });
  });
});

// Admin/Warden retrieve student dues
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

// Get a single due by due ID (but since no due_id, perhaps by student/month/year)
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

// Update individual student dues (warden/admin) - update all items for that student/month/year
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

module.exports = router;
