const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  WARDEN: Get Complaints for Warden's Hostel
*/
router.get("/", auth, role("Warden"), (req, res) => {
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

        const complaintsQuery = `
      SELECT c.complaint_id, s.name, s.roll_number, r.room_number,
             c.description, c.status, c.complaint_date, c.priority, c.assigned_to, c.remarks
      FROM complaint c
      JOIN student s ON c.student_id = s.student_id
      LEFT JOIN room r ON s.room_id = r.room_id
      WHERE s.hostel_id = ?
      ORDER BY c.complaint_date DESC
    `;

        db.query(complaintsQuery, [hostel_id], (err, complaints) => {
            if (err) return res.status(500).json(err);
            res.json(complaints);
        });
});

/*
  WARDEN: Update Complaint Details dynamically
*/
router.put("/:id", auth, role("Warden"), (req, res) => {
    const { status, priority, assigned_to, remarks } = req.body;
    const complaint_id = req.params.id;

    let updates = [];
    let values = [];

    if (status) { updates.push("status = ?"); values.push(status); }
    if (priority) { updates.push("priority = ?"); values.push(priority); }
    if (assigned_to !== undefined) { updates.push("assigned_to = ?"); values.push(assigned_to); }
    if (remarks !== undefined) { updates.push("remarks = ?"); values.push(remarks); }

    if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

    values.push(complaint_id);
    const query = `UPDATE complaint SET ${updates.join(', ')} WHERE complaint_id = ?`;

    db.query(query, values, (err) => {
        if (err) return res.status(500).json(err);

        // Notify student that status changed
        if (status) {
            db.query("SELECT student_id, description FROM complaint WHERE complaint_id = ?", [complaint_id], (err2, rows) => {
                if (!err2 && rows.length > 0) {
                    const studentId = rows[0].student_id;
                    const description = rows[0].description;
                    const message = `Your complaint '${description}' is now ${status}.`;

                    const notifService = require("../utils/notificationService");
                    notifService.createNotification({ student_id: studentId, title: "Complaint status update", message, type: "complaint" }).catch(e => console.error("Notification error:", e.message));
                }
            });
        }

        res.json({ message: "Complaint details updated successfully" });
    });
});

module.exports = router;
