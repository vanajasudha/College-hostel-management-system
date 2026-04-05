/**
 * ROLE-BASED ACCESS CONTROL MIDDLEWARE
 *
 * This middleware enforces role-based permissions on API routes.
 * It ensures users can only access endpoints appropriate to their role.
 *
 * Usage:
 * router.get('/admin-only', auth, role('Admin'), handler);
 * router.get('/warden-student', auth, role('Warden', 'Admin'), handler);
 *
 * Available Roles:
 * - Student: Can access student-specific features
 * - Warden: Can manage their assigned hostel
 * - Admin: Full system access
 */

const roleMiddleware = (...allowedRoles) => {
  // Return middleware function that checks user role
  return (req, res, next) => {
    // Check if user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied - insufficient permissions",
      });
    }

    // User has required role, continue to route handler
    next();
  };
};

module.exports = roleMiddleware;