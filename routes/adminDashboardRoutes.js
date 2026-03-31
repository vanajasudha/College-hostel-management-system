const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

/*
  ADMIN: Dashboard KPI Data
*/
router.get("/kpi", auth, role("Admin"), (req, res) => {
    // Collect all 6 KPI metrics in parallel
    const getTotalHostels = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM hostel", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    const getTotalRooms = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count, IFNULL(SUM(capacity), 0) AS total_capacity FROM room", (err, result) => {
            if (err) reject(err); else resolve(result[0]);
        });
    });

    const getTotalStudents = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM student", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    const getOccupiedBeds = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(student_id) AS count FROM student WHERE room_id IS NOT NULL", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    const getTotalPayments = new Promise((resolve, reject) => {
        db.query("SELECT IFNULL(SUM(amount), 0) AS total FROM payment WHERE status = 'Paid'", (err, result) => {
            if (err) reject(err); else resolve(result[0].total);
        });
    });

    const getTotalComplaints = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM complaint", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    Promise.all([getTotalHostels, getTotalRooms, getTotalStudents, getOccupiedBeds, getTotalPayments, getTotalComplaints])
        .then(([hostels, roomsData, students, occupiedBeds, payments, complaints]) => {
            
            // Calculate Occupancy Percentage System-Wide
            let occupancy = 0;
            if (roomsData.total_capacity > 0) {
                occupancy = Math.round((occupiedBeds / roomsData.total_capacity) * 100);
            }

            // Format Payment Currency String
            let formattedPayments = `₹${payments}`;
            if (payments >= 100000) {
                formattedPayments = `₹${(payments / 100000).toFixed(1)}L`;
            } else if (payments >= 1000) {
                formattedPayments = `₹${(payments / 1000).toFixed(1)}K`;
            }

            res.json({
                totalHostels: hostels,
                totalRooms: roomsData.count,
                totalStudents: students,
                occupancy: occupancy,
                totalPayments: formattedPayments,
                totalComplaints: complaints
            });
        })
        .catch(error => {
            res.status(500).json({ message: "Error fetching Admin KPI data", error });
        });
});

/*
  ADMIN: Dashboard Chart Data
*/
router.get("/charts", auth, role("Admin"), (req, res) => {

    const getOccupancyDistribution = new Promise((resolve, reject) => {
        const q = `
            SELECT 
                h.hostel_name, 
                COUNT(DISTINCT r.room_id) as total_rooms,
                COUNT(DISTINCT s.room_id) as occupied_rooms
            FROM hostel h
            LEFT JOIN room r ON h.hostel_id = r.hostel_id
            LEFT JOIN student s ON h.hostel_id = s.hostel_id AND s.room_id IS NOT NULL
            GROUP BY h.hostel_id, h.hostel_name
            ORDER BY h.hostel_name ASC
        `;
        db.query(q, (err, result) => {
            if (err) reject(err); else resolve(result);
        });
    });

    const getMonthlyPayments = new Promise((resolve, reject) => {
        const q = `
            SELECT month, monthly_revenue
            FROM (
                SELECT MONTH(payment_date) AS month_num,
                       MONTHNAME(payment_date) AS month,
                       SUM(amount) AS monthly_revenue
                FROM payment
                WHERE status = 'Paid'
                GROUP BY MONTH(payment_date), MONTHNAME(payment_date)
            ) AS monthly
            ORDER BY month_num
            LIMIT 6
        `;
        db.query(q, (err, result) => {
            if (err) reject(err); else resolve(result);
        });
    });

    Promise.all([getOccupancyDistribution, getMonthlyPayments])
        .then(([distribution, payments]) => {
            res.json({
                occupancyDistribution: distribution,
                monthlyPayments: payments
            });
        })
        .catch(error => {
            res.status(500).json({ message: "Error fetching Admin Chart data", error });
        });
});

module.exports = router;
