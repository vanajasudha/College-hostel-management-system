const express = require("express");
const router = express.Router();
const db = require("../config/db");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const notifService = require("../utils/notificationService");

// GET all students (Restricted to Warden/Admin)
router.get("/", auth, role("Warden", "Admin"), (req, res) => {
  db.query("SELECT * FROM student", (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(result);
  });
});

// GET logged-in student with room and hostel details
router.get("/details", auth, role("Student"), (req, res) => {
  // Try login_id first (roll_number), fallback to reference_id
  const roll_number = req.user.login_id || req.user.reference_id;

  // Use LEFT JOIN so students without rooms don't get 404s
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

    // Auto fee reminder notifications for pending dues, once per session.
    try {
      await notifService.createFeeReminderForStudent(student.student_id);
    } catch (notifyErr) {
      console.error("Fee-reminder notification creation failed:", notifyErr.message);
    }

    res.json(student);
  });
});
// LEFT JOIN: Students with or without complaints
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
module.exports = router;