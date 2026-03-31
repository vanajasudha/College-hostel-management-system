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

    const normalizedLoginId = String(login_id).trim();

    // Find user by normalized login_id, avoiding whitespace and casing issues
    const query = "SELECT * FROM users WHERE TRIM(login_id) = ?";

    db.query(query, [normalizedLoginId], async (err, result) => {
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

      // Compare password (support both plain text and hashed for migration)
      let isMatch = false;
      if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$') || dbPassword.startsWith('$2y$')) {
        // Hashed password
        isMatch = await bcrypt.compare(inputPassword, dbPassword);
      } else {
        // Plain text password
        isMatch = inputPassword === dbPassword;
      }

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

/*
  FORGOT PASSWORD API
  Generates a temporary 6-digit password and updates user password
*/
router.post("/forgot-password", (req, res) => {
  try {
    const { login_id } = req.body;

    if (!login_id) {
      return res.status(400).json({
        message: "Login ID is required",
      });
    }

    const normalizedLoginId = String(login_id).trim();

    // Check if user exists
    db.query(
      "SELECT u.user_id, u.reference_id, s.email FROM users u LEFT JOIN student s ON u.reference_id = s.student_id WHERE TRIM(u.login_id) = ?",
      [normalizedLoginId],
      async (err, result) => {
        if (err) {
          return res.status(500).json({ error: err });
        }

        if (result.length === 0) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const user = result[0];
        
        // Generate 6-digit temporary password
        const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the temporary password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Update password in database
        db.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashedPassword, user.user_id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err });
            }

            // Log the temp password for demo (in production, send via email)
            console.log(`Temporary password for ${normalizedLoginId}: ${tempPassword}`);

            res.json({
              message: "Temporary password generated successfully",
              tempPassword: tempPassword,
              note: "Your temporary password has been generated. Use it to login and then change it immediately.",
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
});

/*
  CONTACT ADMIN API
  Stores contact messages from users
*/
router.post("/contact-admin", (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email, and message are required",
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        message: "Message must be at least 10 characters long",
      });
    }

    // Insert into contact_messages table
    db.query(
      "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err });
        }

        res.json({
          message: "Your message has been sent to admin successfully",
          id: result.insertId,
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
});

module.exports = router;