const express = require("express");
const router = express.Router();
const db = require("../config/db");
const notifService = require("../utils/notificationService");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Utility: Send notification in a non-blocking way
const sendNotification = async ({ student_id, title, message, type = 'fee' }) => {
  try {
    const result = await notifService.createNotification({ student_id, title, message, type });
    if (!result.created) {
      // Already exists; skip silently
      console.info(`[Payment Notification] not created (duplicate): student ${student_id}`);
    }
  } catch (notifErr) {
    console.error(`[Payment Notification] failed for student ${student_id}:`, notifErr.message);
  }
};

// Pay due for month & year using dues table
router.post("/", auth, role("Student"), (req, res) => {
  const { month, year, method, payment_type, category, amount } = req.body;
  const student_id = req.user.reference_id;

  if (!month || !year || !method) {
    return res.status(400).json({ message: "month, year and method are required" });
  }

  const paymentType = payment_type ? payment_type : 'Monthly Dues';
  if (!['Monthly Dues', 'Custom Payment'].includes(paymentType)) {
    return res.status(400).json({ message: "payment_type must be 'Monthly Dues' or 'Custom Payment'" });
  }

  const allowedCategories = ['Hostel', 'Mess', 'Electricity', 'Fine', 'Other'];
  const paymentCategory = category ? category : 'Hostel';
  if (!allowedCategories.includes(paymentCategory)) {
    return res.status(400).json({ message: "category must be one of Hostel, Mess, Electricity, Fine, Other" });
  }

  let customAmount = null;
  if (paymentType === 'Custom Payment') {
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "Custom amount is required for Custom Payment" });
    }
    customAmount = Number(amount);
    if (Number.isNaN(customAmount) || customAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
  }

  // Get total amount for the period
  const totalQuery = `SELECT SUM(amount) as total_amount FROM dues WHERE student_id = ? AND month = ? AND year = ? AND status = 'unpaid'`;
  db.query(totalQuery, [student_id, month, Number(year)], (err, totalRows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!totalRows || !totalRows[0].total_amount) return res.status(404).json({ message: "No unpaid dues found for selected period" });

    const total_amount = Number(totalRows[0].total_amount);
    let paidAmount = customAmount !== null ? customAmount : total_amount;

    // Cap custom payment to total_amount for due settlement but allow partial payments
    if (paymentType === 'Custom Payment' && paidAmount > total_amount) {
      paidAmount = total_amount;
    }

    const transaction_id = `TXN${Date.now()}`;

    const insertPayment = `INSERT INTO payment (student_id, amount, payment_date, status, payment_month, method, transaction_id, payment_type, category) VALUES (?, ?, NOW(), 'Paid', ?, ?, ?, ?, ?)`;
    db.query(insertPayment, [student_id, paidAmount, month, method, transaction_id, paymentType, paymentCategory], (payErr) => {
      if (payErr) return res.status(500).json({ message: payErr.message });

      const shouldMarkPaid = paymentType === 'Monthly Dues' || paidAmount >= total_amount;
      if (shouldMarkPaid) {
        db.query(`UPDATE dues SET status = 'paid', paid_at = NOW() WHERE student_id = ? AND month = ? AND year = ? AND status = 'unpaid'`, [student_id, month, Number(year)], (updErr) => {
          if (updErr) return res.status(500).json({ message: updErr.message });

          const message = `Payment of ₹${paidAmount} received for ${month} ${year}. Your dues are now marked as paid.`;
          sendNotification({ student_id, title: 'Payment Successful', message, type: 'fee' });

          return res.json({ message: "Payment recorded", month, year, amount: paidAmount, transaction_id, payment_type: paymentType, category: paymentCategory });
        });
      } else {
        const remaining = total_amount - paidAmount;
        const message = `Partial payment of ₹${paidAmount} received for ${month} ${year}. Remaining due ₹${remaining}.`;
        sendNotification({ student_id, title: 'Partial Payment Recorded', message, type: 'fee' });

        return res.json({ message: "Custom payment recorded (partial)", month, year, amount: paidAmount, transaction_id, payment_type: paymentType, category: paymentCategory, remaining_due: remaining });
      }
    });
  });
});

// Pertinent student payment history remains from payment table
router.get("/", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;
  const query = `
    SELECT payment_month, amount, payment_date, method, status, transaction_id, payment_type
    FROM payment
    WHERE student_id = ?
    ORDER BY payment_date DESC
  `;

  db.query(query, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(result);
  });
});

// Get all dues status (paid/unpaid) for student
router.get("/due", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;
  const query = `
    SELECT month, year, category, amount, status, due_date, paid_at
    FROM dues
    WHERE student_id = ? AND status IN ('unpaid', 'overdue')
    ORDER BY year DESC, FIELD(month, 'January','February','March','April','May','June','July','August','September','October','November','December')
  `;

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error("[Student Payment] Due list query error:", err);
      return res.status(500).json({ message: "Failed to retrieve dues list" });
    }

    // Group by month, year
    const grouped = {};
    results.forEach(row => {
      const key = `${row.month}-${row.year}`;
      if (!grouped[key]) {
        grouped[key] = { month: row.month, year: row.year, total_amount: 0, items: [], due_date: row.due_date, status: 'unpaid' };
      }
      grouped[key].items.push({ category: row.category, amount: Number(row.amount) });
      grouped[key].total_amount += Number(row.amount);
      if (row.status === 'overdue') grouped[key].status = 'overdue';
    });

    const dueMonths = Object.values(grouped);
    res.json({ dueMonths });
  });
});

module.exports = router;