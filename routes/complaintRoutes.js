const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Middleware
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  STUDENT: Create Complaint
  Only logged-in students can add complaints
  student_id is read from JWT — never trust the client to send it
*/
router.post("/", auth, role("Student"), (req, res) => {
  const { description } = req.body;

  console.log("[POST /complaints] body:", req.body);
  console.log("[POST /complaints] user from token:", req.user);

  if (!description || !String(description).trim()) {
    return res.status(400).json({ message: "Description is required." });
  }

  // student_id comes from JWT — secure & reliable
  const student_id = req.user.reference_id;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID not found in token. Please log in again." });
  }

  // Let MySQL auto-increment handle complaint_id (no manual random ID)
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

/*
  STUDENT: View Own Complaints
  IMPORTANT: This must come BEFORE the generic GET "/" route
*/
router.get("/my", auth, role("Student"), (req, res) => {
  const student_id = req.user.reference_id;

  console.log("[GET /complaints/my] student_id:", student_id);

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

/*
  VIEW ALL COMPLAINTS (Protected — Warden / Admin)
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

/*
  WARDEN: Update Complaint Status
  Only wardens can update complaints
*/
router.put("/:id", auth, role("Warden"), (req, res) => {
  const { status } = req.body;
  const complaint_id = req.params.id;

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

module.exports = router;