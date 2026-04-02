const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validatePassword } = require("../utils/validatePassword");

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

/*
  LOGIN — plain text or bcrypt ($2a$...) passwords
*/
router.post("/login", (req, res) => {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Login ID and password are required",
      });
    }

    const normalizedLoginId = String(login_id).trim();
    const query =
      "SELECT * FROM users WHERE TRIM(login_id) = ? LIMIT 1";

    db.query(query, [normalizedLoginId], async (err, result) => {
      if (err) {
        return serverError(res, err, "login query");
      }

      if (!result || result.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid login ID",
        });
      }

      const user = result[0];

      const isValid = await validatePassword(password, user.password);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      const signAndSendToken = (additionalPayload = {}) => {
        if (!process.env.JWT_SECRET) {
          console.error("[auth] JWT_SECRET is not set");
          return res.status(500).json({
            success: false,
            message: "Server configuration error",
          });
        }

        const token = jwt.sign(
          {
            user_id: user.user_id,
            login_id: user.login_id,
            role: user.role,
            reference_id: user.reference_id,
            ...additionalPayload,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          message: "Login successful",
          token,
          role: user.role,
          reference_id: user.reference_id,
          ...additionalPayload,
        });
      };

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
            return signAndSendToken({ hostel_id: wardenRes[0].hostel_id });
          }
        );
        return;
      }

      return signAndSendToken();
    });
  } catch (error) {
    return serverError(res, error, "login");
  }
});

/*
  FORGOT PASSWORD — always store bcrypt hash (default reset: 1234)
*/
router.post("/forgot-password", (req, res) => {
  try {
    const { login_id } = req.body;

    if (!login_id) {
      return res.status(400).json({
        success: false,
        message: "Login ID is required",
      });
    }

    const normalizedLoginId = String(login_id).trim();

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
        const newPassword = "1234";

        let hashed;
        try {
          hashed = await bcrypt.hash(newPassword, 10);
        } catch (hashErr) {
          return serverError(res, hashErr, "forgot-password hash");
        }

        db.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashed, row.user_id],
          (updErr) => {
            if (updErr) {
              return serverError(res, updErr, "forgot-password update");
            }

            return res.json({
              success: true,
              message: "Password reset successfully",
              tempPassword: newPassword,
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

/*
  CONTACT ADMIN
*/
router.post("/contact-admin", (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters long",
      });
    }

    db.query(
      "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message],
      (insErr, insResult) => {
        if (insErr) {
          return serverError(res, insErr, "contact-admin insert");
        }

        return res.json({
          success: true,
          message: "Your message has been sent to admin successfully",
          id: insResult.insertId,
        });
      }
    );
  } catch (error) {
    return serverError(res, error, "contact-admin");
  }
});

module.exports = router;
