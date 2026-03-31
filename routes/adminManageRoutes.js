const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const bcrypt = require("bcryptjs");

// ─── HOSTELS ─────────────────────────────────────────────────────────────────

// GET all hostels
router.get("/hostels", auth, role("Admin"), (req, res) => {
    const q = `
        SELECT 
            h.hostel_id   AS hostelId, 
            h.hostel_name AS name,
            COALESCE((SELECT SUM(r.capacity) FROM room r WHERE r.hostel_id = h.hostel_id), 0) AS capacity,
            w.name AS warden
        FROM hostel h
        LEFT JOIN warden w ON w.hostel_id = h.hostel_id
    `;
    db.query(q, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /hostels SQL error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("[adminManage] hostels returned:", result.length);
        res.json(result);
    });
});

// ─── ROOMS ───────────────────────────────────────────────────────────────────

// GET all rooms
router.get("/rooms", auth, role("Admin"), (req, res) => {
    const q = `
        SELECT 
            r.room_id,
            r.room_number,
            h.hostel_name,
            r.capacity,
            r.status,
            (SELECT COUNT(*) FROM student s WHERE s.room_id = r.room_id) AS occupied
        FROM room r
        JOIN hostel h ON r.hostel_id = h.hostel_id
        ORDER BY h.hostel_name, r.room_number
    `;
    db.query(q, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /rooms →", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("[adminManage] rooms returned:", result.length);
        res.json(result);
    });
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────

// GET all students
router.get("/students", auth, role("Admin"), (req, res) => {
    const q = `
        SELECT 
            s.student_id, 
            s.name, 
            s.roll_number,
            s.gender,
            s.phone, 
            s.email,
            s.department,
            h.hostel_name, 
            r.room_number
        FROM student s
        LEFT JOIN hostel h ON s.hostel_id = h.hostel_id
        LEFT JOIN room   r ON s.room_id   = r.room_id
        ORDER BY s.student_id
    `;
    db.query(q, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /students →", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("[adminManage] students returned:", result.length);
        res.json(result);
    });
});

// POST add new student (auto creates user account)
router.post("/students", auth, role("Admin"), async (req, res) => {
    const { name, gender, phone, email, hostel_id, room_id, roll_number, department } = req.body;

    // Validate required fields
    if (!name || !roll_number || !department) {
        return res.status(400).json({ message: "Name, roll_number, and department are required" });
    }

    // Insert student
    const studentQuery = `
        INSERT INTO student (name, gender, phone, email, hostel_id, room_id, roll_number, department)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const studentValues = [name, gender, phone, email, hostel_id, room_id, roll_number, department];

    db.query(studentQuery, studentValues, async (err, result) => {
        if (err) {
            console.error("[adminManage] POST /students insert student error:", err.message);
            return res.status(500).json({ error: err.message });
        }

        const newStudentId = result.insertId;

        // Auto-create user account
        const hashedPassword = await bcrypt.hash('1234', 10);
        const userQuery = `
            INSERT INTO users (login_id, password, role, reference_id)
            VALUES (?, ?, 'Student', ?)
            ON DUPLICATE KEY UPDATE reference_id = reference_id
        `;
        const userValues = [roll_number, hashedPassword, newStudentId];

        db.query(userQuery, userValues, (userErr, userResult) => {
            if (userErr) {
                console.error("[adminManage] POST /students insert user error:", userErr.message);
                // Don't fail the request if user creation fails, but log it
            }

            console.log("[adminManage] Student added with ID:", newStudentId);
            res.status(201).json({
                message: "Student added successfully",
                student_id: newStudentId
            });
        });
    });
});

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

// GET payment stats summary
router.get("/payments/stats", auth, role("Admin"), (req, res) => {
    const statQuery = `SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payment WHERE status = 'Paid'`;
    db.query(statQuery, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /payments/stats:", err.message);
            return res.status(500).json({ error: err.message });
        }
        const total = result?.[0]?.total_revenue || 0;
        console.log("[adminManage] Total payments (Paid):", total);
        res.json({ total_revenue: total });
    });
});

// GET payment history
router.get("/payments/history", auth, role("Admin"), (req, res) => {
    const q = `
        SELECT p.transaction_id, s.name AS student_name,
               MONTHNAME(p.payment_date) AS month, p.amount, p.method,
               p.status, p.payment_date
        FROM payment p
        LEFT JOIN student s ON p.student_id = s.student_id
        ORDER BY p.payment_date DESC
        LIMIT 200
    `;
    db.query(q, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /payments/history:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("[adminManage] payments returned:", result.length);
        console.log("[adminManage] Payments sample:", result.slice(0, 3));
        res.json(result);
    });
});

// GET all payments raw (for /api/payments)
router.get("/payments/all", auth, role("Admin"), (req, res) => {
    const q = `SELECT * FROM payment ORDER BY date DESC LIMIT 1000`;
    db.query(q, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /payments/all:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("[adminManage] /payments/all returned:", result.length);
        res.json(result);
    });
});

// GET paid total (for /api/payments/total)
router.get("/payments/total", auth, role("Admin"), (req, res) => {
    const totalQuery = `SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE status = 'Paid'`;
    db.query(totalQuery, (err, result) => {
        if (err) {
            console.error("[adminManage] GET /payments/total:", err.message);
            return res.status(500).json({ error: err.message });
        }
        const totalAmount = result?.[0]?.total || 0;
        console.log("[adminManage] Total paid amount:", totalAmount);
        res.json({ total: totalAmount });
    });
});

// ─── COMPLAINTS ──────────────────────────────────────────────────────────────

// GET all complaints
router.get("/complaints/history", auth, role("Admin"), (req, res) => {
    const q = `
        SELECT c.complaint_id, s.name AS student_name,
               h.hostel_name, r.room_number,
               c.description, c.status, c.complaint_date
        FROM complaint c
        JOIN student s ON c.student_id = s.student_id
        LEFT JOIN hostel h ON s.hostel_id = h.hostel_id
        LEFT JOIN room r ON s.room_id = r.room_id
        ORDER BY c.complaint_date DESC
    `;
    db.query(q, (err, result) => {
        if (err) { console.error("[adminManage] GET /complaints/history:", err.message); return res.status(500).json({ error: err.message }); }
        console.log("[adminManage] complaints returned:", result.length);
        res.json(result);
    });
});

module.exports = router;
