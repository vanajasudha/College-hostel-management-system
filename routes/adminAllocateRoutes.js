const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const notifService = require("../utils/notificationService");

// GET all active allocations across all hostels
router.get("/", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const query = `
        SELECT s.student_id, s.name, s.hostel_id, s.room_id, 
               h.name as hostel_name, r.room_number 
        FROM student s 
        JOIN hostel h ON s.hostel_id = h.hostel_id 
        JOIN room r ON s.room_id = r.room_id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching allocations." });
        res.json(results);
    });
});

// GET dynamically available rooms, optionally filtered by hostel
router.get("/rooms", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const hostel_id = req.query.hostel_id;
    let query = `
        SELECT r.room_id, r.room_number, r.capacity, r.occupied_beds, r.hostel_id, h.name as hostel_name
        FROM room r
        JOIN hostel h ON r.hostel_id = h.hostel_id
        WHERE r.status = 'Available' AND r.occupied_beds < r.capacity
    `;
    const params = [];

    if (hostel_id) {
        query += ` AND r.hostel_id = ?`;
        params.push(hostel_id);
    }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching available rooms." });
        res.json(results);
    });
});

// PUT /assign: Safely map a student to a new room globally
router.put("/assign", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    const { student_id, new_room_id, new_hostel_id } = req.body;
    if (!student_id || !new_room_id || !new_hostel_id) {
        return res.status(400).json({ message: "Student, Room, and Hostel IDs are explicitly required." });
    }

    // 1. Validate NEW Room capacity constraint
    db.query(`SELECT capacity, occupied_beds, status FROM room WHERE room_id = ? AND hostel_id = ?`, 
             [new_room_id, new_hostel_id], (err, roomRes) => {
        
        if (err) return res.status(500).json({ message: "DB error verifying room", error: err.message });
        if (roomRes.length === 0) return res.status(404).json({ message: "Room not found in specified hostel." });
        
        const targetRoom = roomRes[0];
        if (targetRoom.status === 'Maintenance') return res.status(400).json({ message: "Room is currently under maintenance." });
        if (targetRoom.occupied_beds >= targetRoom.capacity) return res.status(400).json({ message: "Room is already at full capacity." });

        // 2. Fetch OLD Room to release a bed
        db.query(`SELECT room_id FROM student WHERE student_id = ?`, [student_id], (err2, studentRes) => {
            if (err2 || studentRes.length === 0) return res.status(500).json({ message: "Error finding active student mapping." });
            
            const oldRoomId = studentRes[0].room_id;

            // 3. Atomically lock & run the transfer logic
            db.beginTransaction(transErr => {
                if (transErr) return res.status(500).json({ message: "Transaction failed." });

                // Decrement old
                const decrQuery = oldRoomId ? `UPDATE room SET occupied_beds = GREATEST(0, occupied_beds - 1) WHERE room_id = ?` : `SELECT 1`;
                db.query(decrQuery, [oldRoomId], (err3) => {
                    if (err3) return db.rollback(() => res.status(500).json({ message: "Failed releasing old bed." }));

                    // Increment new
                    db.query(`UPDATE room SET occupied_beds = occupied_beds + 1 WHERE room_id = ?`, [new_room_id], (err4) => {
                        if (err4) return db.rollback(() => res.status(500).json({ message: "Failed capturing new bed." }));

                        // Update Student
                        db.query(`UPDATE student SET room_id = ?, hostel_id = ? WHERE student_id = ?`, 
                                 [new_room_id, new_hostel_id, student_id], (err5) => {
                            
                            if (err5) return db.rollback(() => res.status(500).json({ message: "Failed moving student record." }));

                            db.commit(commitErr => {
                                if (commitErr) return db.rollback(() => res.status(500).json({ message: "Commit failed." }));

                                // Notification for room allocation
                                db.query(`SELECT room_number FROM room WHERE room_id = ?`, [new_room_id], (errRoom, roomRows) => {
                                    const roomNumber = (roomRows && roomRows.length > 0) ? roomRows[0].room_number : new_room_id;
                                    notifService.createNotification({
                                        student_id,
                                        title: "Room Allocation Updated",
                                        message: `You have been allocated Room ${roomNumber}.`,
                                        type: "room"
                                    }).catch(e => console.error("Room allocation notification failed:", e.message));

                                    res.json({ message: "Spatial Allocation Successfully Executed." });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
