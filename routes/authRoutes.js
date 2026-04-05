/**
 * AUTHENTICATION ROUTES
 *
 * Handles user login and authentication for the hostel management system.
 * Supports three user types: Students, Wardens, and Admins.
 *
 * Endpoints:
 * - POST /api/auth/login - User authentication
 *
 * Security Features:
 * - Password hashing with bcrypt
 * - JWT token generation
 * - Input validation and sanitization
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");              // Database connection
const bcrypt = require("bcrypt");                // Password hashing
const jwt = require("jsonwebtoken");             // JWT token generation
const { validatePassword } = require("../utils/validatePassword"); // Password validation

/**
 * SERVER ERROR HELPER FUNCTION
 * Standardized error response for database and server errors
 */
function serverError(res, err, logLabel) {
  const message = err && err.message != null ? String(err.message) : String(err);
  if (logLabel) {
    console.error(`[auth] ${logLabel}:`, message);
  }
  return res.status(500).json({
    success: false,
    message: "Server error",
    error: message,
  });
}

/**
 * LOGIN ENDPOINT
 * POST /api/auth/login
 *
 * Authenticates users and returns JWT token for API access.
 * Supports both plain text and bcrypt-hashed passwords for migration compatibility.
 */
router.post("/login", (req, res) => {
  try {
    // Extract login credentials from request body
    const { login_id, password } = req.body;

    // VALIDATE INPUT
    if (!login_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Login ID and password are required",
      });
    }

    // Normalize login ID (trim whitespace)
    const normalizedLoginId = String(login_id).trim();

    // QUERY USER FROM DATABASE
    const query = "SELECT * FROM users WHERE TRIM(login_id) = ? LIMIT 1";

    db.query(query, [normalizedLoginId], async (err, result) => {
      if (err) {
        return serverError(res, err, "login query");
      }

      // CHECK IF USER EXISTS
      if (!result || result.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid login ID",
        });
      }

      const user = result[0]; // Get user record

      // VALIDATE PASSWORD
      // Uses custom validatePassword function to handle both plain text and bcrypt hashes
      const isValid = await validatePassword(password, user.password);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      /**
       * TOKEN GENERATION HELPER FUNCTION
       * Creates JWT token and sends login success response
       * @param {Object} additionalPayload - Extra data to include in token (e.g., hostel_id for wardens)
       */
      const signAndSendToken = (additionalPayload = {}) => {
        // CHECK JWT SECRET CONFIGURATION
        if (!process.env.JWT_SECRET) {
          console.error("[auth] JWT_SECRET is not set");
          return res.status(500).json({
            success: false,
            message: "Server configuration error",
          });
        }

        // GENERATE JWT TOKEN
        // Includes user ID, login ID, role, and reference ID in payload
        const token = jwt.sign(
          {
            user_id: user.user_id,
            login_id: user.login_id,
            role: user.role,
            reference_id: user.reference_id,
            ...additionalPayload, // Additional data like hostel_id for wardens
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" } // Token expires in 24 hours
        );

        // SEND SUCCESS RESPONSE
        return res.json({
          message: "Login successful",
          token, // JWT token for API authentication
          role: user.role,
          reference_id: user.reference_id,
          ...additionalPayload, // Include additional data in response
        });
      };

      // HANDLE WARDEN LOGIN
      // Wardens need their hostel_id included in the token for hostel-specific operations
      if (user.role === "Warden") {
        db.query(
          "SELECT hostel_id FROM warden WHERE employee_id = ?",
          [user.login_id],
          (wardenErr, wardenRes) => {
            if (wardenErr) {
              return serverError(res, wardenErr, "warden lookup");
            }
            if (!wardenRes || wardenRes.length === 0) {
              return res.status(404).json({
                success: false,
                message: "Warden record not found in system.",
              });
            }
            // Generate token with hostel_id for warden-specific access
            return signAndSendToken({ hostel_id: wardenRes[0].hostel_id });
          }
        );
        return; // Exit early for async warden lookup
      }

      // HANDLE STUDENT/ADMIN LOGIN
      // No additional data needed for these roles
      return signAndSendToken();
    });
  } catch (error) {
    return serverError(res, error, "login");
  }
});

/**
 * FORGOT PASSWORD ENDPOINT
 * POST /api/auth/forgot-password
 *
 * Resets user password to default "1234" (bcrypt hashed).
 * Used when users forget their passwords.
 *
 * Security Note: This is a simple implementation for demo purposes.
 * In production, consider email verification or more secure reset methods.
 */
router.post("/forgot-password", (req, res) => {
  try {
    // EXTRACT LOGIN ID FROM REQUEST
    const { login_id } = req.body;

    // VALIDATE INPUT
    if (!login_id) {
      return res.status(400).json({
        success: false,
        message: "Login ID is required",
      });
    }

    // NORMALIZE LOGIN ID
    const normalizedLoginId = String(login_id).trim();

    // CHECK IF USER EXISTS
    db.query(
      "SELECT u.user_id FROM users u WHERE TRIM(u.login_id) = ? LIMIT 1",
      [normalizedLoginId],
      async (qErr, result) => {
        if (qErr) {
          return serverError(res, qErr, "forgot-password query");
        }

        if (!result || result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const row = result[0];
        const newPassword = "1234"; // Default reset password

        // HASH NEW PASSWORD
        let hashed;
        try {
          hashed = await bcrypt.hash(newPassword, 10);
        } catch (hashErr) {
          return serverError(res, hashErr, "forgot-password hash");
        }

        // UPDATE PASSWORD IN DATABASE
        db.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashed, row.user_id],
          (updErr) => {
            if (updErr) {
              return serverError(res, updErr, "forgot-password update");
            }

            // SEND SUCCESS RESPONSE
            return res.json({
              success: true,
              message: "Password reset successfully",
              tempPassword: newPassword, // Return temp password for user convenience
              note: "Sign in with this password. Change it after logging in if your profile supports updates.",
            });
          }
        );
      }
    );
  } catch (error) {
    return serverError(res, error, "forgot-password");
  }
});

/**
 * CONTACT ADMIN ENDPOINT
 * POST /api/auth/contact-admin
 *
 * Allows users to send messages to administrators.
 * Stores messages in contact_messages table for admin review.
 *
 * Validation:
 * - All fields required (name, email, message)
 * - Email format validation
 * - Minimum message length (10 characters)
 */
router.post("/contact-admin", (req, res) => {
  try {
    // EXTRACT CONTACT FORM DATA
    const { name, email, message } = req.body;

    // VALIDATE REQUIRED FIELDS
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    // VALIDATE EMAIL FORMAT
    if (!email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // VALIDATE MESSAGE LENGTH
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters long",
      });
    }

    // INSERT MESSAGE INTO DATABASE
    db.query(
      "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message],
      (insErr, insResult) => {
        if (insErr) {
          return serverError(res, insErr, "contact-admin insert");
        }

        // SEND SUCCESS RESPONSE
        return res.json({
          success: true,
          message: "Your message has been sent to admin successfully",
          id: insResult.insertId, // Return inserted message ID
        });
      }
    );
  } catch (error) {
    return serverError(res, error, "contact-admin");
  }
});

// EXPORT ROUTER
// Makes authentication routes available for mounting in main server.js
module.exports = router;
