/**
 * MAIN APPLICATION COMPONENT
 *
 * This is the root component of the React application.
 * It sets up routing, authentication context, and renders all pages.
 *
 * Architecture:
 * - Uses React Router for client-side routing
 * - Authentication context manages user state globally
 * - Protected routes ensure role-based access control
 * - Dashboard layout provides consistent navigation
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// PAGE COMPONENTS
// Standalone pages
import Login from "./pages/Login";

// DASHBOARD COMPONENTS (Role-specific pages)
// Student dashboards
import StudentDashboard from "./dashboard/StudentDashboard";
import StudentProfile from "./dashboard/StudentProfile";
import StudentPayments from "./dashboard/StudentPayments";
import StudentComplaints from "./dashboard/StudentComplaints";

// Warden dashboards
import WardenDashboard from "./dashboard/WardenDashboard";
import WardenStudents from "./dashboard/WardenStudents";
import WardenComplaints from "./dashboard/WardenComplaints";
import WardenAnalytics from "./dashboard/WardenAnalytics";
import WardenAllocate from "./dashboard/WardenAllocate";
import WardenPayments from "./dashboard/WardenPayments";
import WardenAllPayments from "./dashboard/WardenAllPayments";

// Admin dashboards
import AdminDashboard from "./dashboard/AdminDashboard";
import AdminHostels from "./dashboard/AdminHostels";
import AdminRooms from "./dashboard/AdminRooms";
import AdminStudents from "./dashboard/AdminStudents";
import AdminAllocate from "./dashboard/AdminAllocate";
import AdminPayments from "./dashboard/AdminPayments";
import AdminComplaints from "./dashboard/AdminComplaints";

// AUTHENTICATION
import { AuthProvider, useAuth } from "./context/AuthContext";

// LAYOUT COMPONENTS
import DashboardLayout from "./components/DashboardLayout";

// ROUTE PROTECTION
import ProtectedRoute from "./routes/ProtectedRoute";

/**
 * AppRoutes Component
 * Defines all application routes and their access controls
 * Uses authentication context to determine which routes to show
 */
function AppRoutes() {
  const { user } = useAuth(); // Get current authenticated user

  return (
    <Routes>
      {/* ROOT ROUTE - Redirect based on authentication status */}
      <Route
        path="/"
        element={
          user ? (
            // User is logged in - redirect to their role-specific dashboard
            <Navigate to={`/${user.role.toLowerCase()}`} />
          ) : (
            // User not logged in - redirect to login page
            <Navigate to="/login" />
          )
        }
      />

      {/* PUBLIC ROUTE - Login page (only accessible when not logged in) */}
      <Route
        path="/login"
        element={
          user ? (
            // Already logged in - redirect to dashboard
            <Navigate to={`/${user.role.toLowerCase()}`} />
          ) : (
            // Show login form
            <Login />
          )
        }
      />
      {/* PROTECTED ROUTES - Require authentication and specific roles */}
      {/* All routes below use DashboardLayout (sidebar + navigation) */}
      <Route element={<DashboardLayout />}>

        {/* STUDENT ROUTES - Only accessible by users with "Student" role */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="Student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute role="Student">
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/payments"
          element={
            <ProtectedRoute role="Student">
              <StudentPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/complaints"
          element={
            <ProtectedRoute role="Student">
              <StudentComplaints />
            </ProtectedRoute>
          }
        />

        {/* WARDEN ROUTES - Only accessible by users with "Warden" role */}
        <Route
          path="/warden"
          element={
            <ProtectedRoute role="Warden">
              <WardenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/students"
          element={
            <ProtectedRoute role="Warden">
              <WardenStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/complaints"
          element={
            <ProtectedRoute role="Warden">
              <WardenComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/analytics"
          element={
            <ProtectedRoute role="Warden">
              <WardenAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/allocate"
          element={
            <ProtectedRoute role="Warden">
              <WardenAllocate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/payments"
          element={
            <ProtectedRoute role="Warden">
              <WardenPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/all-payments"
          element={
            <ProtectedRoute role="Warden">
              <WardenAllPayments />
            </ProtectedRoute>
          }
        />

        {/* ADMIN ROUTES - Only accessible by users with "Admin" role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/hostels"
          element={
            <ProtectedRoute role="Admin">
              <AdminHostels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <ProtectedRoute role="Admin">
              <AdminRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute role="Admin">
              <AdminStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/allocate"
          element={
            <ProtectedRoute role="Admin">
              <AdminAllocate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute role="Admin">
              <AdminPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute role="Admin">
              <AdminComplaints />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* FALLBACK ROUTE - Redirect unknown URLs to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

/**
 * Main App Component
 * Wraps the entire application with necessary providers
 */
function App() {
  return (
    <AuthProvider>  {/* Provides authentication context to all components */}
      <BrowserRouter>  {/* Enables client-side routing */}
        <AppRoutes />  {/* Renders the route configuration */}
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;