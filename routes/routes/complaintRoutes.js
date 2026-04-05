/**
 * COMPLAINT ROUTES
 *
 * Handles complaint submission, viewing, and management.
 * Supports different access levels for Students, Wardens, and Admins.
 *
 * Endpoints:
 * - POST /api/complaints - Submit new complaint (Students only)
 * - GET /api/complaints/my - View own complaints (Students only)
 * - GET /api/complaints - View all complaints (Warden/Admin only)
 * - PUT /api/complaints/:id - Update complaint status (Wardens only)
 *
 * Authentication: JWT required for all endpoints
 * Security: Student ID extracted from JWT token, not from client input
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control

/**
 * SUBMIT COMPLAINT
 * POST /api/complaints
 *
 * Allows students to submit maintenance or other complaints.
 * Student ID is securely extracted from JWT token.
 *
 * Security: Never trusts client-provided student_id
 */
router.post("/", auth, role("Student"), (req, res) => {
  const { description } = req.body;

  console.log("[POST /complaints] body:", req.body);
  console.log("[POST /complaints] user from token:", req.user);

  // VALIDATE INPUT
  if (!description || !String(description).trim()) {
    return res.status(400).json({ message: "Description is required." });
  }

  // EXTRACT STUDENT ID FROM JWT TOKEN
  // More secure than trusting client-provided data
  const student_id = req.user.reference_id;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID not found in token. Please log in again." });
  }

  // INSERT COMPLAINT INTO DATABASE
  // Uses auto-increment for complaint_id, sets default status to 'Pending'
  const query = `
    INSERT INTO complaint (student_id, description, complaint_date, status)
    VALUES (?, ?, CURDATE(), 'Pending')
  `;

  db.query(query, [student_id, description.trim()], (err, result) => {
    if (err) {
      console.error("[POST /complaints] DB error:", err);
      return res.status(500).json({ message: "Database error: " + err.message });
    }
    res.json({
      message: "Complaint submitted successfully",
      complaint_id: result.insertId,
    });
  });
});

/**
 * VIEW OWN COMPLAINTS
 * GET /api/complaints/my
 *
 * Students can view their own submitted complaints.
 * Route placed before generic GET "/" to avoid conflicts.
 */
router.get("/my", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;

  console.log("[GET /complaints/my] student_id:", student_id);

  // QUERY STUDENT'S COMPLAINTS
  const query = `
    SELECT complaint_id, description, status, complaint_date
    FROM complaint
    WHERE student_id = ?
    ORDER BY complaint_date DESC
  `;

  db.query(query, [student_id], (err, result) => {
    if (err) {
      console.error("[GET /complaints/my] DB error:", err);
      return res.status(500).json({ message: "Database error: " + err.message });
    }
    res.json(result);
  });
});

/**
 * VIEW ALL COMPLAINTS
 * GET /api/complaints
 *
 * Wardens and Admins can view all complaints with student details.
 * Includes student name and roll number for context.
 */
router.get("/", auth, (req, res) => {
  const query = `
    SELECT c.complaint_id, s.name, s.roll_number,
           c.description, c.status, c.complaint_date
    FROM complaint c
    JOIN student s ON c.student_id = s.student_id
    ORDER BY c.complaint_date DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("[GET /complaints] DB error:", err);
      return res.status(500).json({ message: "Database error: " + err.message });
    }
    res.json(result);
  });
});

/**
 * UPDATE COMPLAINT STATUS
 * PUT /api/complaints/:id
 *
 * Wardens can update complaint status (e.g., Pending → Resolved).
 * Restricted to Warden role for proper authorization.
 */
router.put("/:id", auth, role("Warden"), (req, res) => {
  const { status } = req.body;
  const complaint_id = req.params.id;

  // UPDATE COMPLAINT STATUS
  const query = `
    UPDATE complaint
    SET status = ?
    WHERE complaint_id = ?
  `;

  db.query(query, [status, complaint_id], (err) => {
    if (err) {
      console.error("[PUT /complaints/:id] DB error:", err);
      return res.status(500).json({ message: "Database error: " + err.message });
    }
    res.json({ message: "Complaint status updated" });
  });
});

// EXPORT ROUTER
// Makes complaint routes available for mounting in main server.js
module.exports = router;