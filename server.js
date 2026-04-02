const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ✅ Database connection
const db = require("./config/db");

// ✅ Import overdue scheduler (starts cron jobs)
require("./overdue-scheduler");

// ✅ Import routes
const studentRoutes = require("./routes/studentRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const authRoutes = require("./routes/authRoutes");
const studentPaymentRoutes = require("./routes/studentPaymentRoutes");
const app = express();

// ✅ Middlewares
app.use(cors());
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

// Real-time Database-Driven Dues Summary
app.get("/api/student/dues-summary", auth, (req, res) => {
  const student_id = req.user.reference_id;

  const query = `
    SELECT month, year, category, amount, status, due_date, paid_at
    FROM dues
    WHERE student_id = ?
    ORDER BY year DESC, FIELD(month, 'January','February','March','April','May','June','July','August','September','October','November','December')
  `;

  db.query(query, [student_id], (err, result) => {
    if (err) {
      console.error("[Dues Summary] Query error:", err);
      return res.status(500).json({ message: "Failed to retrieve dues summary" });
    }

    // Group by month, year
    const grouped = {};
    result.forEach(row => {
      const key = `${row.month}-${row.year}`;
      if (!grouped[key]) {
        grouped[key] = { month: row.month, year: row.year, total_amount: 0, status: 'paid', items: [], due_date: row.due_date };
      }
      grouped[key].items.push({ category: row.category, amount: Number(row.amount) });
      grouped[key].total_amount += Number(row.amount);
      if (row.status === 'unpaid' || row.status === 'overdue') grouped[key].status = row.status;
    });

    const detailedMonths = Object.values(grouped);

    let total_due = 0;
    let overdue_count = 0;
    const pending_months = new Set();
    const paid_months = new Set();

    detailedMonths.forEach(m => {
      if (m.status === 'unpaid' || m.status === 'overdue') {
        total_due += m.total_amount;
        pending_months.add(`${m.month}-${m.year}`);
        if (m.status === 'overdue') overdue_count++;
      }
      if (m.status === 'paid') paid_months.add(`${m.month}-${m.year}`);
    });

    res.json({
      total_due,
      pending_months: pending_months.size,
      paid_months: paid_months.size,
      overdue_count,
      total_months: new Set([...pending_months, ...paid_months]).size,
      detailedMonths
    });
  });
});

// ✅ Complaint APIs
app.use("/api/complaints", complaintRoutes);

// ✅ Auth APIs
app.use("/api/auth", authRoutes);

//  student payment APIs
app.use("/api/student/payment", studentPaymentRoutes);

// ✅ Warden payment APIs
const wardenPaymentRoutes = require("./routes/wardenPaymentRoutes");
app.use("/api/warden/payment", wardenPaymentRoutes);

// ✅ Warden complaint analytics
const wardenComplaintAnalytics = require("./routes/wardenComplaintAnalytics");
app.use("/api/warden/complaints/analytics", wardenComplaintAnalytics);

// ✅ Warden Dashboard APIs
const wardenDashboardRoutes = require("./routes/wardenDashboardRoutes");
app.use("/api/warden/dashboard", wardenDashboardRoutes);

// ✅ Warden Manage Students API
const wardenStudentRoutes = require("./routes/wardenStudentRoutes");
app.use("/api/warden/students", wardenStudentRoutes);

// ✅ Warden Complaints API
const wardenComplaintRoutes = require("./routes/wardenComplaintRoutes");
app.use("/api/warden/complaints", wardenComplaintRoutes);

// ✅ Warden Room Allocation API
const wardenAllocateRoutes = require("./routes/wardenAllocateRoutes");
app.use("/api/warden/allocate", wardenAllocateRoutes);

// ✅ Warden Notifications API
const wardenNotificationRoutes = require("./routes/wardenNotificationRoutes");
app.use("/api/warden/notifications", wardenNotificationRoutes);

// ✅ Admin Dashboard APIs
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
app.use("/api/admin/dashboard", adminDashboardRoutes);

// ✅ Admin Manage APIs (Hostels, Rooms, Students)
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

// ✅ Admin Payment / Dues Generation API
const adminPaymentRoutes = require("./routes/adminPaymentRoutes");
app.use("/api/admin/payments", adminPaymentRoutes);

// ✅ Admin Allocations API
const adminAllocateRoutes = require("./routes/adminAllocateRoutes");
app.use("/api/admin/allocate", adminAllocateRoutes);

// ✅ Admin Complaints API
const adminComplaintRoutes = require("./routes/adminComplaintRoutes");
app.use("/api/admin/complaints", adminComplaintRoutes);

// ✅ Admin Notifications API
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
app.use("/api/admin/notifications", adminNotificationRoutes);

// ✅ Student Notifications API
const notificationsRoutes = require("./routes/notificationsRoutes");
app.use("/api/notifications", notificationsRoutes);

// ✅ Admin analytics
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
app.use("/api/admin/analytics", adminAnalyticsRoutes);

// ✅ Public/standard payments API
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

// ✅ Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});