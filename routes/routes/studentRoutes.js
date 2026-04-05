/**
 * STUDENT ROUTES
 *
 * Handles student-related operations and data retrieval.
 * Supports different access levels for Students, Wardens, and Admins.
 *
 * Endpoints:
 * - GET /api/students - Get all students (Warden/Admin only)
 * - GET /api/students/details - Get logged-in student's details with room/hostel info
 * - GET /api/students/complaints - Get student complaints (Admin/Warden only)
 *
 * Authentication: JWT required for all endpoints
 * Role-based Access: Different endpoints for different user roles
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control
const notifService = require("../utils/notificationService"); // Notification service

/**
 * GET ALL STUDENTS
 * GET /api/students
 *
 * Returns complete list of all students in the system.
 * Restricted to Wardens and Admins for privacy and security.
 */
router.get("/", auth, role("Warden", "Admin"), (req, res) => {
  db.query("SELECT * FROM student", (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(result);
  });
});

/**
 * GET STUDENT DETAILS
 * GET /api/students/details
 *
 * Returns detailed information for the currently logged-in student.
 * Includes room allocation, hostel details, and occupancy information.
 *
 * Features:
 * - Automatic fee reminder notifications for pending dues
 * - Room and hostel information via LEFT JOINs
 * - Fallback login ID handling
 */
router.get("/details", auth, role("Student"), (req, res) => {
  // EXTRACT STUDENT IDENTIFIER
  // Try login_id first (roll_number), fallback to reference_id for compatibility
  const roll_number = req.user.login_id || req.user.reference_id;

  // COMPREHENSIVE STUDENT QUERY
  // LEFT JOIN ensures students without rooms still get basic info
  const query = `
    SELECT s.student_id, s.name, s.roll_number, s.gender, s.phone, s.email,
           r.room_number, r.capacity,
           h.hostel_name,
           (SELECT COUNT(*) FROM student WHERE room_id = s.room_id) AS occupants
    FROM student s
    LEFT JOIN room r ON s.room_id = r.room_id
    LEFT JOIN hostel h ON s.hostel_id = h.hostel_id
    WHERE s.roll_number = ?
  `;

  db.query(query, [roll_number], async (err, result) => {
    if (err) {
      return res.status(500).json({ message: "DB Error fetching student details", error: err.message });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Student details not found." });
    }

    const student = result[0];

    // AUTO-GENERATE FEE REMINDER NOTIFICATIONS
    // Creates notifications for pending dues (once per session)
    try {
      await notifService.createFeeReminderForStudent(student.student_id);
    } catch (notifyErr) {
      console.error("Fee-reminder notification creation failed:", notifyErr.message);
      // Continue with response even if notification fails
    }

    res.json(student);
  });
});

/**
 * GET STUDENT COMPLAINTS
 * GET /api/students/complaints
 *
 * Returns complaints data joined with student information.
 * Used by Wardens and Admins to view complaint status across students.
 *
 * LEFT JOIN ensures all students are included, even those without complaints.
 */
router.get("/complaints", auth, role("Admin", "Warden"), (req, res) => {
  const query = `
    SELECT s.student_id, s.name,
           c.description, c.status
    FROM student s
    LEFT JOIN complaint c
    ON s.student_id = c.student_id
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

// EXPORT ROUTER
// Makes student routes available for mounting in main server.js
module.exports = router;