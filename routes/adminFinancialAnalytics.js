const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

console.log("Financial analytics route loaded");

router.get("/", auth, role("Admin"), (req, res) => {

  const totalQuery = `
    SELECT SUM(amount) AS total_revenue
    FROM payment
    WHERE status = 'Paid'
  `;

  const monthlyQuery = `
    SELECT payment_month, SUM(amount) AS monthly_revenue
    FROM payment
    WHERE status = 'Paid'
    GROUP BY payment_month
  `;

  const methodQuery = `
    SELECT method, COUNT(*) AS transactions, SUM(amount) AS total_amount
    FROM payment
    WHERE status = 'Paid'
    GROUP BY method
  `;

  db.query(totalQuery, (err, total) => {
    if (err) return res.status(500).json(err);

    db.query(monthlyQuery, (err, monthly) => {
      if (err) return res.status(500).json(err);

      db.query(methodQuery, (err, methods) => {
        if (err) return res.status(500).json(err);

        res.json({
          total_revenue: total[0].total_revenue || 0,
          monthly_revenue: monthly,
          payment_methods: methods
        });
      });
    });
  });
});

router.get("/history", auth, role("Admin"), (req, res) => {
  const query = `
    SELECT p.transaction_id, s.name as student_name, p.payment_month as month, p.amount, p.method, p.status, p.payment_date 
    FROM payment p
    JOIN student s ON p.student_id = s.student_id
    ORDER BY p.payment_date DESC
    LIMIT 100
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

module.exports = router;