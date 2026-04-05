/**
 * PROTECTED ROUTE COMPONENT
 *
 * Higher-order component that guards routes based on authentication and user roles.
 * Ensures only authenticated users with appropriate roles can access protected pages.
 *
 * How it works:
 * 1. Checks if user is logged in (has valid JWT token)
 * 2. Verifies user has required role for the route (if role prop provided)
 * 3. Redirects unauthorized users to appropriate pages
 *
 * Usage:
 * <ProtectedRoute role="Admin">
 *   <AdminDashboard />
 * </ProtectedRoute>
 *
 * Props:
 * - role: Optional string ("Student", "Warden", "Admin") - required role for access
 * - children: React component(s) to render if access granted
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";  // React Router navigation
import { useAuth } from "../context/AuthContext";         // Authentication context

const ProtectedRoute = ({ role, children }) => {
    // GET AUTHENTICATION STATE
    const { user } = useAuth();           // Current authenticated user from context
    const location = useLocation();       // Current route location for redirect state

    // CHECK 1: USER NOT LOGGED IN
    // If no user in context (no valid JWT), redirect to login page
    // Preserve current location in state so user can return after login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // CHECK 2: ROLE-BASED ACCESS CONTROL
    // If route requires specific role but user doesn't have it
    if (role && user.role !== role) {
        // FORCE REDIRECT TO USER'S ACTUAL DASHBOARD
        // Prevents unauthorized access attempts
        return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
    }

    // CHECK 3: ACCESS GRANTED
    // User is authenticated and has required role (or no role restriction)
    return children;
};

export default ProtectedRoute;