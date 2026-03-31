const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/", auth, role("Admin"), (req, res) => {
  const q = `
    SELECT p.transaction_id,
           s.name AS student_name,
           MONTHNAME(p.payment_date) AS month,
           p.amount,
           p.method,
           p.status,
           p.payment_date
    FROM payment p
    LEFT JOIN student s ON p.student_id = s.student_id
    ORDER BY p.payment_date DESC
    LIMIT 1000
  `;
  db.query(q, (err, result) => {
    if (err) {
      console.error("[paymentRoutes] GET /api/payments:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("[paymentRoutes] /api/payments returned:", result.length);
    res.json(result);
  });
});

router.get("/total", auth, role("Admin"), (req, res) => {
  const q = `SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE status = 'Paid'`;
  db.query(q, (err, result) => {
    if (err) {
      console.error("[paymentRoutes] GET /api/payments/total:", err.message);
      return res.status(500).json({ error: err.message });
    }
    const total = result?.[0]?.total || 0;
    console.log("[paymentRoutes] /api/payments/total total:", total);
    res.json({ total });
  });
});

module.exports = router;
