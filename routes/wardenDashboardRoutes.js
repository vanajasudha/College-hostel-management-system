/**
 * WARDEN DASHBOARD ROUTES
 *
 * Provides dashboard data and analytics for hostel wardens.
 * All endpoints are restricted to authenticated wardens and filtered by their assigned hostel.
 *
 * Endpoints:
 * - GET /api/warden/dashboard/summary - Comprehensive hostel statistics
 * - GET /api/warden/dashboard/analytics - Charts data for complaints and revenue
 *
 * Security: Warden role required, data filtered by warden's assigned hostel_id
 * Performance: Uses parallel queries for efficient data loading
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");                    // Database connection
const auth = require("../middleware/authMiddleware");  // JWT authentication
const role = require("../middleware/roleMiddleware");  // Role-based access control

/**
 * WARDEN DASHBOARD SUMMARY ENDPOINT
 * GET /api/warden/dashboard/summary
 *
 * Returns comprehensive statistics for the warden's assigned hostel.
 * Includes student counts, room status, complaints, and financial data.
 *
 * Metrics returned:
 * - total_students: Total students in warden's hostel
 * - total_rooms: Total rooms in hostel
 * - total_capacity: Total bed capacity
 * - occupied_rooms: Rooms with at least one student
 * - available_rooms: Rooms marked as available
 * - pending_complaints: Unresolved complaints
 * - maintenance_rooms: Rooms under maintenance
 * - total_pending_dues: Outstanding payment amounts
 * - total_collected: Total payments received
 */
router.get("/summary", auth, role("Warden"), (req, res) => {
    // GET WARDEN'S HOSTEL ID
    // Wardens can only see data for their assigned hostel
    const employee_id = req.user.login_id;

    db.query("SELECT hostel_id FROM warden WHERE employee_id = ?", [employee_id], (err, wardenRes) => {
        if (err) {
            console.error("[Warden Dashboard] Warden lookup error:", err);
            return res.status(500).json({ message: "Failed to retrieve warden info" });
        }
        if (!wardenRes || wardenRes.length === 0) {
            return res.status(403).json({ message: "Warden not found" });
        }
        const hostel_id = wardenRes[0].hostel_id;

        // DEFINE ALL SUMMARY QUERIES
        // Each query gets a specific metric for the warden's hostel
        const queries = {
            total_students: "SELECT COUNT(*) AS c FROM student WHERE hostel_id = ?",
            total_rooms: "SELECT COUNT(*) AS c FROM room WHERE hostel_id = ?",
            total_capacity: "SELECT SUM(capacity) AS c FROM room WHERE hostel_id = ?",
            occupied_rooms: "SELECT COUNT(DISTINCT room_id) AS c FROM student WHERE hostel_id = ? AND room_id IS NOT NULL",
            available_rooms: "SELECT COUNT(*) AS c FROM room WHERE hostel_id = ? AND status = 'Available'",
            pending_complaints: "SELECT COUNT(*) AS c FROM complaint c JOIN student s ON c.student_id = s.student_id WHERE s.hostel_id = ? AND c.status = 'Pending'",
            maintenance_rooms: "SELECT COUNT(*) AS c FROM room WHERE hostel_id = ? AND status = 'Maintenance'",
            total_pending_dues: "SELECT COALESCE(SUM(d.amount), 0) AS c FROM dues d JOIN student s ON d.student_id = s.student_id WHERE s.hostel_id = ? AND d.status IN ('unpaid', 'overdue')",
            total_collected: "SELECT COALESCE(SUM(p.amount), 0) AS c FROM payment p JOIN student s ON p.student_id = s.student_id WHERE s.hostel_id = ? AND p.status = 'Paid'"
        };

        // EXECUTE ALL QUERIES IN PARALLEL
        // Convert queries object to array of promises for concurrent execution
        const promises = Object.entries(queries).map(([key, q]) => {
            return new Promise((resolve) => {
                db.query(q, [hostel_id], (e, r) => {
                    if (e) {
                        console.error(`[Warden Dashboard] ${key} query error:`, e);
                        resolve({ [key]: 0 }); // Return 0 on error to prevent dashboard crash
                    } else {
                        resolve({ [key]: (r && r[0] && r[0].c) || 0 });
                    }
                });
            });
        });

        // AGGREGATE RESULTS
        Promise.all(promises)
            .then(results => {
                const summary = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                res.json(summary);
            })
            .catch(e => {
                console.error("[Warden Dashboard] Summary error:", e);
                res.status(500).json({ message: "Failed to load dashboard summary" });
            });
    });
});

/**
 * WARDEN ANALYTICS ENDPOINT
 * GET /api/warden/dashboard/analytics
 *
 * Returns chart data for warden's dashboard analytics.
 * Includes monthly complaint trends, revenue data, and dues breakdown.
 *
 * Data returned:
 * - complaints: Monthly complaint counts (last 6 months)
 * - revenue: Monthly payment revenue (last 6 months)
 * - dues: Breakdown of dues by status (paid/unpaid/overdue)
 */
router.get("/analytics", auth, role("Warden"), (req, res) => {
    // GET WARDEN'S HOSTEL ID (same as summary endpoint)
    const employee_id = req.user.login_id;

    db.query("SELECT hostel_id FROM warden WHERE employee_id = ?", [employee_id], (err, wardenRes) => {
        if (err) {
            console.error("[Warden Analytics] Warden lookup error:", err);
            return res.status(500).json({ message: "Failed to retrieve warden info" });
        }
        if (!wardenRes || wardenRes.length === 0) {
            return res.status(403).json({ message: "Warden not found" });
        }
        const hostel_id = wardenRes[0].hostel_id;

        // MONTHLY COMPLAINTS QUERY
        // Groups complaints by month for trend analysis
        const complaintsQuery = new Promise((resolve) => {
            db.query(`SELECT DATE_FORMAT(c.complaint_date, '%b') as month, COUNT(*) as count FROM complaint c JOIN student s ON c.student_id = s.student_id WHERE s.hostel_id = ? GROUP BY month, MONTH(c.complaint_date) ORDER BY MONTH(c.complaint_date) DESC LIMIT 6`, [hostel_id], (e, r) => {
                if (e) {
                    console.error("[Warden Analytics] Complaints query error:", e);
                    resolve([]);
                } else {
                    resolve(r ? r.reverse() : []); // Reverse to chronological order
                }
            });
        });

        // MONTHLY REVENUE QUERY
        // Aggregates payment amounts by month
        const revenueQuery = new Promise((resolve) => {
            db.query(`SELECT DATE_FORMAT(p.payment_date, '%b') as month, SUM(p.amount) as revenue FROM payment p JOIN student s ON p.student_id = s.student_id WHERE s.hostel_id = ? AND p.status = 'Paid' GROUP BY month, MONTH(p.payment_date) ORDER BY MONTH(p.payment_date) DESC LIMIT 6`, [hostel_id], (e, r) => {
                if (e) {
                    console.error("[Warden Analytics] Revenue query error:", e);
                    resolve([]);
                } else {
                    resolve(r ? r.reverse() : []); // Reverse to chronological order
                }
            });
        });

        // DUES STATUS BREAKDOWN
        // Groups outstanding dues by status
        const duesQuery = new Promise((resolve) => {
            db.query(`SELECT d.status, SUM(d.amount) as amount FROM dues d JOIN student s ON d.student_id = s.student_id WHERE s.hostel_id = ? GROUP BY d.status`, [hostel_id], (e, r) => {
                if (e) {
                    console.error("[Warden Analytics] Dues query error:", e);
                    resolve([]);
                } else {
                    resolve(r || []);
                }
            });
        });

        // EXECUTE ANALYTICS QUERIES
        Promise.all([complaintsQuery, revenueQuery, duesQuery])
            .then(([complaints, revenue, dues]) => {
                res.json({ complaints, revenue, dues });
            })
            .catch(e => {
                console.error("[Warden Analytics] Error:", e);
                res.status(500).json({ message: "Failed to load analytics" });
            });
    });
});

// EXPORT ROUTER
// Makes warden dashboard routes available for mounting in main server.js
module.exports = router;
