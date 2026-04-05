/**
 * PAYMENT ROUTES
 *
 * Handles payment-related operations and data retrieval.
 * Provides payment history, totals, and transaction management.
 *
 * Endpoints:
 * - GET /api/payments - Get recent payments with student details (Admin only)
 * - GET /api/payments/total - Get total payment amount (Admin only)
 * - GET /api/payments/all - Get all payments with full details (Admin only)
 *
 * Authentication: JWT required for all endpoints
 * Access: Restricted to Admin role for financial data privacy
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control

/**
 * GET RECENT PAYMENTS
 * GET /api/payments
 *
 * Returns recent payment transactions with student information.
 * Limited to 1000 records for performance, ordered by date descending.
 *
 * Includes: transaction ID, student name, month, amount, method, category, status, date
 */
router.get("/", auth, role("Admin"), (req, res) => {
  const q = `
    SELECT p.transaction_id,
           s.name AS student_name,
           MONTHNAME(p.payment_date) AS month,
           p.amount,
           p.method,
           p.category,
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

/**
 * GET TOTAL PAYMENT AMOUNT
 * GET /api/payments/total
 *
 * Returns the sum of all paid payments in the system.
 * Used for financial reporting and dashboard KPIs.
 *
 * Only includes payments with status = 'Paid'
 */
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

/**
 * GET ALL PAYMENTS
 * GET /api/payments/all
 *
 * Returns complete payment history with full details.
 * Higher limit (2000) for comprehensive financial reporting.
 *
 * Includes: transaction ID, student name, category, amount, method, status, date
 */
router.get("/all", auth, role("Admin"), (req, res) => {
  const q = `
    SELECT p.transaction_id,
           s.name AS student_name,
           p.category,
           p.amount,
           p.method,
           p.status,
           p.payment_date
    FROM payment p
    LEFT JOIN student s ON p.student_id = s.student_id
    ORDER BY p.payment_date DESC
    LIMIT 2000
  `;

  db.query(q, (err, result) => {
    if (err) {
      console.error("[paymentRoutes] GET /api/payments/all:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// EXPORT ROUTER
// Makes payment routes available for mounting in main server.js
module.exports = router;
