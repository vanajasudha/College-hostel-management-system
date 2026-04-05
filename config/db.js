/**
 * DATABASE CONFIGURATION
 *
 * This file establishes the connection to the MySQL database using mysql2 library.
 * It creates a connection pool that can be used throughout the application.
 *
 * Environment Variables (from .env file):
 * - DB_HOST: MySQL server hostname (default: localhost)
 * - DB_USER: MySQL username (default: root)
 * - DB_PASSWORD: MySQL password (default: empty)
 * - DB_NAME: Database name (default: hostel_db)
 */

const mysql = require("mysql2"); // MySQL client library for Node.js

// Create database connection using environment variables
// Falls back to defaults if .env variables are not set
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',     // MySQL server address
  user: process.env.DB_USER || 'root',          // MySQL username
  password: process.env.DB_PASSWORD || '',      // MySQL password
  database: process.env.DB_NAME || 'hostel_db', // Database name
});

// Test the database connection on startup
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("Make sure MySQL server is running and credentials are correct");
    process.exit(1); // Exit application if database connection fails
  } else {
    console.log("✅ MySQL Connected Successfully 🚀");
    console.log(`Connected to database: ${process.env.DB_NAME || 'hostel_db'}`);
  }
});

// Export the database connection object for use in other files
module.exports = db;