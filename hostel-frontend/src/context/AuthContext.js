/**
 * AUTHENTICATION CONTEXT
 *
 * This context manages user authentication state across the entire React application.
 * It provides login/logout functionality and user information to all components.
 *
 * Features:
 * - Global user state management
 * - Persistent login (survives page refresh)
 * - Automatic logout on token expiration
 * - JWT token storage in localStorage
 */

import React, { createContext, useContext, useState, useEffect } from "react";

// Create authentication context
export const AuthContext = createContext();

// Authentication Provider Component
// Wraps the entire app to provide authentication state
export const AuthProvider = ({ children }) => {
    // User state - stores current authenticated user information
    const [user, setUser] = useState(null);

    // LOAD USER FROM LOCALSTORAGE ON APP STARTUP
    // This ensures user stays logged in after page refresh
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                // Parse stored user data and update state
                setUser(JSON.parse(storedUser));
            } catch (error) {
                // Invalid stored data - clear it
                localStorage.removeItem("user");
                localStorage.removeItem("token");
            }
        }
    }, []);

    /**
     * Login function - called after successful authentication
     * @param {Object} data - User data from login API response
     * @param {string} data.role - User role (Student/Warden/Admin)
     * @param {number} data.reference_id - Primary key ID for the user's role table
     * @param {number} data.hostel_id - Hostel ID (for wardens)
     * @param {string} data.token - JWT authentication token
     */
    const login = (data) => {
        // Extract user information from API response
        const userData = {
            role: data.role,
            reference_id: data.reference_id,
            hostel_id: data.hostel_id, // Only present for wardens
        };

        // Store JWT token for API requests
        localStorage.setItem("token", data.token);
        // Store user data for persistence
        localStorage.setItem("user", JSON.stringify(userData));
        // Update React state
        setUser(userData);
    };

    /**
     * Logout function - clears all authentication data
     */
    const logout = () => {
        // Remove stored authentication data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Clear React state
        setUser(null);
    };

    // Provide authentication functions and state to child components
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// CUSTOM HOOK - Easy way to access authentication context
// Usage: const { user, login, logout } = useAuth();
export const useAuth = () => {
    return useContext(AuthContext);
};