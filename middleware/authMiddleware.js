/**
 * AUTHENTICATION MIDDLEWARE
 *
 * This middleware validates JWT (JSON Web Tokens) for protected API routes.
 * It runs before route handlers to ensure user is authenticated.
 *
 * How it works:
 * 1. Extracts JWT token from Authorization header
 * 2. Verifies token signature using JWT_SECRET
 * 3. Decodes token to get user information
 * 4. Attaches user data to req.user for use in route handlers
 * 5. Calls next() to continue to route handler, or returns 401 if invalid
 */

const jwt = require("jsonwebtoken"); // Library for JWT token handling

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Format: "Bearer <token>"
    const token = req.headers.authorization?.split(" ")[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        message: "No token, authorization denied",
      });
    }

    // Verify and decode the JWT token
    // Throws error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user information to request object
    // Available in route handlers as req.user
    req.user = decoded; // Contains: { userId, role, reference_id, hostel_id? }

    // Continue to the next middleware/route handler
    next();

  } catch (error) {
    // Token verification failed (invalid signature, expired, malformed)
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;