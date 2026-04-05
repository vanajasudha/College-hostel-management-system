/**
 * COLLEGE HOSTEL MANAGEMENT SYSTEM - BACKEND SERVER
 *
 * This is the main entry point for the Node.js/Express backend API server.
 * It handles all HTTP requests from the React frontend and communicates with the MySQL database.
 *
 * Architecture: Express.js REST API server with JWT authentication
 * Port: 5000 (configured in .env)
 * Database: MySQL with connection pooling
 */

// Import required Node.js modules and third-party packages
const express = require("express"); // Web framework for building REST APIs
const cors = require("cors"); // Enables Cross-Origin Resource Sharing for frontend communication
require("dotenv").config(); // Load environment variables from .env file

// Import database connection configuration
const db = require("./config/db"); // MySQL connection pool setup

// Import and initialize automated background jobs (cron scheduler)
require("./overdue-scheduler"); // Handles automatic overdue notifications and reminders

// Import all API route handlers (controllers for different features)
const studentRoutes = require("./routes/studentRoutes"); // Student profile and information
const complaintRoutes = require("./routes/complaintRoutes"); // Complaint management system
const authRoutes = require("./routes/authRoutes"); // User authentication (login/logout)
const studentPaymentRoutes = require("./routes/studentPaymentRoutes"); // Student payment operations
const app = express(); // Create Express application instance

// MIDDLEWARE SETUP
// These functions run on every request before reaching route handlers

// Enable CORS to allow requests from React frontend (different port)
app.use(cors());

// Parse incoming JSON data from request bodies
app.use(express.json());

// ✅ Root route (test server)
app.get("/", (req, res) => {
  res.send("College Hostel Backend Running 🚀");
});

// ✅ Student APIs
app.use("/api/students", studentRoutes);

// ✅ Pending Dues API
const auth = require("./middleware/authMiddleware");
const duesRoutes = require("./routes/duesRoutes");
app.use("/api", duesRoutes);

// STUDENT DUES SUMMARY ENDPOINT
// GET /api/student/dues-summary
// Returns aggregated dues information for the logged-in student
// Protected route - requires authentication
app.get("/api/student/dues-summary", auth, (req, res) => {
  // Extract student ID from JWT token (added by auth middleware)
  const student_id = req.user.reference_id;

  // SQL query to fetch all dues for this student
  // Orders by year (newest first), then by month order
  const query = `
    SELECT month, year, category, amount, status, due_date, paid_at
    FROM dues
    WHERE student_id = ?
    ORDER BY year DESC, FIELD(month, 'January','February','March','April','May','June','July','August','September','October','November','December')
  `;

  // Execute database query
  db.query(query, [student_id], (err, result) => {
    if (err) {
      console.error("[Dues Summary] Query error:", err);
      return res.status(500).json({ message: "Failed to retrieve dues summary" });
    }

    // GROUP DUES BY MONTH/YEAR
    // Transform flat database rows into grouped summary objects
    const grouped = {};
    result.forEach(row => {
      const key = `${row.month}-${row.year}`;
      if (!grouped[key]) {
        // Initialize new month entry
        grouped[key] = {
          month: row.month,
          year: row.year,
          total_amount: 0,
          status: 'paid', // Default to paid
          items: [], // Individual dues items (hostel, electricity)
          due_date: row.due_date
        };
      }
      // Add this due item to the month
      grouped[key].items.push({
        category: row.category,
        amount: Number(row.amount)
      });
      // Update total amount for this month
      grouped[key].total_amount += Number(row.amount);
      // If any item is unpaid/overdue, mark whole month as such
      if (row.status === 'unpaid' || row.status === 'overdue') {
        grouped[key].status = row.status;
      }
    });

    // Convert grouped object to array
    const detailedMonths = Object.values(grouped);

    // CALCULATE SUMMARY STATISTICS
    let total_due = 0; // Total amount student owes
    let overdue_count = 0; // Number of overdue months
    const pending_months = new Set(); // Unique pending month identifiers
    const paid_months = new Set(); // Unique paid month identifiers

    detailedMonths.forEach(m => {
      if (m.status === 'unpaid' || m.status === 'overdue') {
        total_due += m.total_amount;
        pending_months.add(`${m.month}-${m.year}`);
        if (m.status === 'overdue') overdue_count++;
      }
      if (m.status === 'paid') {
        paid_months.add(`${m.month}-${m.year}`);
      }
    });

    // Return aggregated summary data to frontend
    res.json({
      total_due, // Total amount owed
      pending_months: pending_months.size, // Count of unpaid months
      paid_months: paid_months.size, // Count of paid months
      overdue_count, // Number of overdue months
      total_months: new Set([...pending_months, ...paid_months]).size, // Total unique months
      detailedMonths // Detailed breakdown by month
    });
  });
});

// MOUNT REMAINING API ROUTES
// Each route group handles a specific feature area

// Complaint management endpoints (create, view, update complaints)
app.use("/api/complaints", complaintRoutes);

// User authentication endpoints (login, logout)
app.use("/api/auth", authRoutes);

// Student payment operations (pay dues, view history)
app.use("/api/student/payment", studentPaymentRoutes);

// WARDEN-SPECIFIC ROUTES (Hostel management)

// Warden payment management (generate dues for hostel)
const wardenPaymentRoutes = require("./routes/wardenPaymentRoutes");
app.use("/api/warden/payment", wardenPaymentRoutes);

// Warden complaint analytics and reporting
const wardenComplaintAnalytics = require("./routes/wardenComplaintAnalytics");
app.use("/api/warden/complaints/analytics", wardenComplaintAnalytics);

// Warden dashboard data and statistics
const wardenDashboardRoutes = require("./routes/wardenDashboardRoutes");
app.use("/api/warden/dashboard", wardenDashboardRoutes);

// Warden student management within their hostel
const wardenStudentRoutes = require("./routes/wardenStudentRoutes");
app.use("/api/warden/students", wardenStudentRoutes);

// Warden complaint handling for their hostel
const wardenComplaintRoutes = require("./routes/wardenComplaintRoutes");
app.use("/api/warden/complaints", wardenComplaintRoutes);

// Warden room allocation management
const wardenAllocateRoutes = require("./routes/wardenAllocateRoutes");
app.use("/api/warden/allocate", wardenAllocateRoutes);

// Warden notification management
const wardenNotificationRoutes = require("./routes/wardenNotificationRoutes");
app.use("/api/warden/notifications", wardenNotificationRoutes);

// ADMIN ROUTES (Global system management)

// Admin dashboard overview and statistics
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Admin CRUD operations for hostels, rooms, students
const adminManageRoutes = require("./routes/adminManageRoutes");
app.use("/api/admin/manage", adminManageRoutes);

// ✅ Admin Manage Hostels API
const adminHostelRoutes = require("./routes/adminHostelRoutes");
app.use("/api/admin/hostels", adminHostelRoutes);

// ✅ Admin Manage Rooms API
const adminRoomRoutes = require("./routes/adminRoomRoutes");
app.use("/api/admin/rooms", adminRoomRoutes);

// ✅ Admin Manage Students API
const adminStudentRoutes = require("./routes/adminStudentRoutes");
app.use("/api/admin/students", adminStudentRoutes);

// Admin global dues generation (all hostels)
const adminPaymentRoutes = require("./routes/adminPaymentRoutes");
app.use("/api/admin/payments", adminPaymentRoutes);

// Admin room allocation management
const adminAllocateRoutes = require("./routes/adminAllocateRoutes");
app.use("/api/admin/allocate", adminAllocateRoutes);

// Admin complaint management (global view)
const adminComplaintRoutes = require("./routes/adminComplaintRoutes");
app.use("/api/admin/complaints", adminComplaintRoutes);

// Admin notification management (system-wide)
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
app.use("/api/admin/notifications", adminNotificationRoutes);

// Student notification endpoints (view/mark as read)
const notificationsRoutes = require("./routes/notificationsRoutes");
app.use("/api/notifications", notificationsRoutes);

// Admin analytics and reporting
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
app.use("/api/admin/analytics", adminAnalyticsRoutes);

// Public payment endpoints (general payment processing)
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

// SERVER STARTUP
// Start the Express server and listen for incoming HTTP requests

const PORT = process.env.PORT || 5000; // Use PORT from .env or default to 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Ready to accept requests from React frontend on port 3000`);
});