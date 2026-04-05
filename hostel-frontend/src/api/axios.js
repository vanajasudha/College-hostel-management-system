/**
 * AXIOS HTTP CLIENT CONFIGURATION
 *
 * This file configures the Axios HTTP client for API communication.
 * It sets up automatic JWT token inclusion and error handling.
 *
 * Features:
 * - Automatic JWT token attachment to requests
 * - Automatic logout on 401 Unauthorized responses
 * - Centralized API base URL configuration
 */

import axios from "axios";

// Create configured Axios instance
const API = axios.create({
    // Backend API base URL (matches server.js port 5000)
    baseURL: "http://localhost:5000/api",
});

// REQUEST INTERCEPTOR
// Automatically add JWT token to all outgoing requests
API.interceptors.request.use((req) => {
    // Get stored JWT token from localStorage
    const token = localStorage.getItem("token");

    // If token exists, add it to Authorization header
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
});

// RESPONSE INTERCEPTOR
// Handle API responses and errors globally
API.interceptors.response.use(
    (response) => {
        // Successful response - return as-is
        return response;
    },
    (error) => {
        // Handle error responses
        if (error.response && error.response.status === 401) {
            // 401 Unauthorized - token expired or invalid
            console.warn("❌ Unauthorized! Logging out...");

            // Clear stored authentication data
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Redirect to login page (only if not already there)
            if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
                window.location.href = "/login";
            }
        }

        // Return the error to the calling component
        return Promise.reject(error);
    }
);

// Export configured Axios instance for use in components
export default API;