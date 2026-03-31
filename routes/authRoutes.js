const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/*
  LOGIN API
  Supports:
  - Student (roll_number)
  - Warden (employee_id)
  - Admin (username)
*/

router.post("/login", async (req, res) => {
  try {
    const { login_id, password } = req.body;

    // Basic validation
    if (!login_id || !password) {
      return res.status(400).json({
        message: "Login ID and password are required",
      });
    }

    // Find user by ID directly, disregarding any client role claim
    const query = "SELECT * FROM users WHERE login_id = ?";

    db.query(query, [login_id], async (err, result) => {
      if (err) {
        return res.status(500).json({ error: err });
      }

      if (result.length === 0) {
        return res.status(401).json({
          message: "Invalid login ID",
        });
      }

      const user = result[0];

      const inputPassword = String(password).trim();
      const dbPassword = String(user.password).trim();
      
      console.log("input password:", inputPassword);
      console.log("database password:", dbPassword);
      console.log("user object:", user);

      // Compare plain text password
      const isMatch = inputPassword === dbPassword;

      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid password",
        });
      }

      const signAndSendToken = (additionalPayload = {}) => {
        const token = jwt.sign(
          {
            user_id: user.user_id,
            login_id: user.login_id,
            role: user.role,
            reference_id: user.reference_id,
            ...additionalPayload
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        res.json({
          message: "Login successful",
          token,
          role: user.role,
          reference_id: user.reference_id,
          ...additionalPayload
        });
      };

      if (user.role === "Warden") {
        // As requested: When a warden logs in, fetch their record from the warden table using employee_id
        db.query("SELECT hostel_id FROM warden WHERE employee_id = ?", [user.login_id], (err, wardenRes) => {
          if (err) return res.status(500).json({ error: err });
          if (wardenRes.length === 0) return res.status(404).json({ message: "Warden record not found in system." });
          
          signAndSendToken({ hostel_id: wardenRes[0].hostel_id });
        });
      } else {
        signAndSendToken();
      }

    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
});

module.exports = router;