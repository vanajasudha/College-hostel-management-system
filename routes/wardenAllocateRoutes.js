const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  WARDEN: Get Availability Overview of all Rooms in Hostel
*/
router.get("/rooms", auth, role("Warden"), (req, res) => {
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

        const roomsQuery = `
            SELECT r.room_id, r.room_number, r.capacity, r.status,
                   COUNT(s.student_id) AS occupied_beds
            FROM room r
            LEFT JOIN student s ON r.room_id = s.room_id
            WHERE r.hostel_id = ?
            GROUP BY r.room_id, r.room_number, r.capacity, r.status
            ORDER BY r.room_number ASC
        `;

        db.query(roomsQuery, [hostel_id], (err, rooms) => {
            if (err) return res.status(500).json(err);
            res.json(rooms);
        });
});

/*
  WARDEN: Get All Students in Hostel (to select for assignment)
*/
router.get("/students", auth, role("Warden"), (req, res) => {
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

        const studentsQuery = `
            SELECT student_id, name, roll_number, room_id
            FROM student 
            WHERE hostel_id = ?
            ORDER BY name ASC
        `;

        db.query(studentsQuery, [hostel_id], (err, students) => {
            if (err) return res.status(500).json(err);
            res.json(students);
        });
});

/*
  WARDEN: Assign Student to a Room
*/
router.put("/assign", auth, role("Warden"), (req, res) => {
    const { student_id, new_room_id } = req.body;
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(403).json({ message: "No active hostel assignment found in token." });

        // Check Room Capacity and Status
        const roomCheckQuery = `
            SELECT r.capacity, r.status, r.hostel_id, 
                   COUNT(s.student_id) AS occupied
            FROM room r
            LEFT JOIN student s ON r.room_id = s.room_id
            WHERE r.room_id = ?
            GROUP BY r.room_id
        `;

        db.query(roomCheckQuery, [new_room_id], (err, roomResult) => {
            if (err) return res.status(500).json(err);
            if (roomResult.length === 0) return res.status(404).json({ message: "Invalid Room Selection" });
            
            const room = roomResult[0];

            if (room.hostel_id !== hostel_id) {
                return res.status(403).json({ message: "You cannot assign rooms outside your hostel territory." });
            }

            if (room.status === 'Maintenance') {
                return res.status(400).json({ message: "This room is currently under maintenance." });
            }

            if (room.occupied >= room.capacity) {
                return res.status(400).json({ message: "This room is completely full." });
            }

            // Room format is valid, verify student is in hostel
            db.query("SELECT hostel_id FROM student WHERE student_id = ?", [student_id], (err, studentResult) => {
                if (err || studentResult.length === 0) return res.status(500).json({ error: "Student not found" });
                
                if (studentResult[0].hostel_id !== hostel_id) {
                    return res.status(403).json({ message: "This student is not assigned to your hostel." });
                }

                // Make the exact Update
                const updateQuery = "UPDATE student SET room_id = ? WHERE student_id = ?";
                db.query(updateQuery, [new_room_id, student_id], (err) => {
                    if (err) return res.status(500).json(err);

                    // Optional: You could update room status from 'Available' to 'Maintenance' dynamically elsewhere
                    res.json({ message: "Student successfully allocated to the new room!" });
                });
            });
        });
});

module.exports = router;
