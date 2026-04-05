/**
 * ADMIN DASHBOARD ROUTES
 *
 * Provides KPI metrics and chart data for the admin dashboard.
 * Includes system-wide statistics and analytics.
 *
 * Endpoints:
 * - GET /api/admin/dashboard/kpi - Key Performance Indicators
 * - GET /api/admin/dashboard/charts - Chart data for visualizations
 *
 * Authentication: Requires Admin role
 * Middleware: auth (JWT validation) + role("Admin") check
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control

/**
 * ADMIN KPI ENDPOINT
 * GET /api/admin/dashboard/kpi
 *
 * Returns 6 key performance indicators for admin dashboard:
 * - Total hostels in system
 * - Total rooms and capacity
 * - Total students enrolled
 * - Current occupancy percentage
 * - Total payments collected (formatted)
 * - Total complaints filed
 */
router.get("/kpi", auth, role("Admin"), (req, res) => {
    // PARALLEL DATA COLLECTION
    // Execute all 6 KPI queries simultaneously for better performance

    // 1. TOTAL HOSTELS COUNT
    const getTotalHostels = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM hostel", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    // 2. TOTAL ROOMS AND CAPACITY
    const getTotalRooms = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count, IFNULL(SUM(capacity), 0) AS total_capacity FROM room", (err, result) => {
            if (err) reject(err); else resolve(result[0]);
        });
    });

    // 3. TOTAL STUDENTS COUNT
    const getTotalStudents = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM student", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    // 4. OCCUPIED BEDS COUNT
    const getOccupiedBeds = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(student_id) AS count FROM student WHERE room_id IS NOT NULL", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    // 5. TOTAL PAYMENTS (PAID STATUS ONLY)
    const getTotalPayments = new Promise((resolve, reject) => {
        db.query("SELECT IFNULL(SUM(amount), 0) AS total FROM payment WHERE status = 'Paid'", (err, result) => {
            if (err) reject(err); else resolve(result[0].total);
        });
    });

    // 6. TOTAL COMPLAINTS COUNT
    const getTotalComplaints = new Promise((resolve, reject) => {
        db.query("SELECT COUNT(*) AS count FROM complaint", (err, result) => {
            if (err) reject(err); else resolve(result[0].count);
        });
    });

    // EXECUTE ALL QUERIES IN PARALLEL
    Promise.all([getTotalHostels, getTotalRooms, getTotalStudents, getOccupiedBeds, getTotalPayments, getTotalComplaints])
        .then(([hostels, roomsData, students, occupiedBeds, payments, complaints]) => {
            
            // CALCULATE OCCUPANCY PERCENTAGE
            let occupancy = 0;
            if (roomsData.total_capacity > 0) {
                occupancy = Math.round((occupiedBeds / roomsData.total_capacity) * 100);
            }

            // FORMAT PAYMENT AMOUNT FOR DISPLAY
            // Convert to K/L format for large numbers
            let formattedPayments = `₹${payments}`;
            if (payments >= 100000) {
                formattedPayments = `₹${(payments / 100000).toFixed(1)}L`;
            } else if (payments >= 1000) {
                formattedPayments = `₹${(payments / 1000).toFixed(1)}K`;
            }

            // SEND KPI RESPONSE
            res.json({
                totalHostels: hostels,
                totalRooms: roomsData.count,
                totalStudents: students,
                occupancy: occupancy,              // Percentage (0-100)
                totalPayments: formattedPayments,  // Formatted currency string
                totalComplaints: complaints
            });
        })
        .catch(error => {
            res.status(500).json({ message: "Error fetching Admin KPI data", error });
        });
});

/**
 * ADMIN CHART DATA ENDPOINT
 * GET /api/admin/dashboard/charts
 *
 * Returns data for dashboard charts and visualizations:
 * - Occupancy distribution by hostel
 * - Monthly payment revenue (last 6 months)
 */
router.get("/charts", auth, role("Admin"), (req, res) => {

    // GET OCCUPANCY DISTRIBUTION BY HOSTEL
    // Shows room occupancy for each hostel for bar/pie charts
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

    // GET MONTHLY PAYMENT REVENUE
    // Aggregates payment amounts by month for revenue trend charts
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

    // EXECUTE CHART QUERIES IN PARALLEL
    Promise.all([getOccupancyDistribution, getMonthlyPayments])
        .then(([distribution, payments]) => {
            res.json({
                occupancyDistribution: distribution,  // [{hostel_name, total_rooms, occupied_rooms}, ...]
                monthlyPayments: payments             // [{month, monthly_revenue}, ...]
            });
        })
        .catch(error => {
            res.status(500).json({ message: "Error fetching Admin Chart data", error });
        });
});

// EXPORT ROUTER
// Makes admin dashboard routes available for mounting in main server.js
module.exports = router;
