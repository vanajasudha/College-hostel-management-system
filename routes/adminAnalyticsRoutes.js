const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");

// GET Master Analytics (Aggregating everything globally)
router.get("/", auth, (req, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });

    // Step 1: Global Occupancy Rate
    const queryOccupancy = `SELECT SUM(capacity) as total_capacity, SUM(occupied_beds) as occupied_beds FROM room WHERE status != 'Maintenance'`;
    
    // Step 2: Global Revenue Trends (Last 6 months)
    const queryRevenue = `
        SELECT month, SUM(amount) as revenue 
        FROM dues 
        WHERE status = 'paid' 
        GROUP BY year, month 
        ORDER BY year DESC, FIELD(month, 'December','November','October','September','August','July','June','May','April','March','February','January') DESC 
        LIMIT 6
    `;

    // Step 3: Dues Pending vs Paid (Current academic window)
    const queryDues = `SELECT status, SUM(amount) as total_amount FROM dues GROUP BY status`;

    // Step 4: Complaint Resolution Rate
    const queryComplaints = `SELECT status, COUNT(*) as count FROM complaint GROUP BY status`;

    // Run queries in parallel
    db.query(queryOccupancy, (err1, resOcc) => {
        if (err1) return res.status(500).json({ message: "Failed parsing global occupancy." });

        db.query(queryRevenue, (err2, resRev) => {
            if (err2) return res.status(500).json({ message: "Failed parsing revenue trends." });

            db.query(queryDues, (err3, resDues) => {
                if (err3) return res.status(500).json({ message: "Failed parsing dues split." });

                db.query(queryComplaints, (err4, resComp) => {
                    if (err4) return res.status(500).json({ message: "Failed parsing grievance rates." });

                    // Process Data
                    const capacityData = resOcc[0] || { total_capacity: 0, occupied_beds: 0 };
                    
                    // Format output payload explicitly for Chart.js
                    res.json({
                        kpi: {
                            total_capacity: capacityData.total_capacity || 0,
                            occupied_beds: capacityData.occupied_beds || 0,
                            occupancy_rate: capacityData.total_capacity > 0 ? Math.round((capacityData.occupied_beds / capacityData.total_capacity) * 100) : 0
                        },
                        charts: {
                            revenue: resRev.reverse(), // Chronological formulation
                            dues: resDues,
                            complaints: resComp
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;