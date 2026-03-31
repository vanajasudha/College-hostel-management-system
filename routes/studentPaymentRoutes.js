const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  STUDENT: Pay Hostel Fee
  Dynamic fee based on student year
  Now also accepts payment_type (defaults to 'Hostel Fee' if not provided)
*/
router.post("/", auth, role("Student"), (req, res) => {
  const { payment_month, method, payment_type } = req.body;

  if (!payment_month || !method) {
    return res.status(400).json({
      message: "Payment month and method are required",
    });
  }

  // Default to 'Hostel Fee' for backward compatibility
  const resolvedType = payment_type && payment_type.trim() ? payment_type.trim() : "Hostel Fee";

  const student_id = req.user.reference_id;

  // Calculate amount based on payment_type
  let amount;
  switch (resolvedType) {
    case "Hostel Fee":   amount = 6000; break;
    case "Mess Fee":     amount = 4000; break;
    case "Maintenance": amount = 1000; break;
    case "Electricity":
      amount = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
      break;
    default:             amount = 6000;
  }

  // Generate transaction ID
  const transaction_id = "TXN" + Date.now();

  // Insert payment record
  const paymentQuery = `
    INSERT INTO payment
    (student_id, amount, payment_date, status, payment_month, method, transaction_id, payment_type)
    VALUES (?, ?, CURDATE(), 'Paid', ?, ?, ?, ?)
  `;

  db.query(
    paymentQuery,
    [student_id, amount, payment_month, method, transaction_id, resolvedType],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });

      res.json({
        message: "Payment successful",
        amount,
        transaction_id,
        payment_type: resolvedType,
      });
    }
  );
});

/*
  STUDENT: View Payment History
  Now includes payment_type in the response
*/
router.get("/", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;

  const query = `
    SELECT payment_month,
           MONTHNAME(payment_date) AS month,
           amount,
           payment_date,
           method,
           status,
           transaction_id,
           payment_type
    FROM payment
    WHERE student_id = ?
    ORDER BY payment_date DESC
  `;

  db.query(query, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(result);
  });
});

/*
  STUDENT: Check unpaid months (Overdue detection)
  Now evaluating all categories so the payment dropdown includes any month with pending dues.
*/
router.get("/due", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;

  const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];
  const categories = ["Hostel Fee", "Mess Fee", "Electricity", "Maintenance"];

  const query = `
    SELECT payment_month, payment_type FROM payment
    WHERE student_id = ?
  `;

  db.query(query, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    const paidSet = new Set(result.map(r => `${r.payment_month}-${r.payment_type}`));
    
    const dueMonths = [];
    months.forEach(month => {
      let isDue = false;
      categories.forEach(category => {
        if (!paidSet.has(`${month}-${category}`)) isDue = true;
      });
      if (isDue) dueMonths.push(month);
    });

    res.json({ dueMonths });
  });
});

module.exports = router;