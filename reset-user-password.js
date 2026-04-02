/**
 * Set password to 1234 (bcrypt) for a login_id. Use if account has an unknown old hash.
 *   node reset-user-password.js CSE2023003
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./config/db");

const loginId = process.argv[2];
if (!loginId || !String(loginId).trim()) {
  console.error("Usage: node reset-user-password.js <login_id>");
  process.exit(1);
}

const normalized = String(loginId).trim();

(async () => {
  try {
    const hashed = await bcrypt.hash("1234", 10);
    db.query(
      "UPDATE users SET password = ? WHERE TRIM(login_id) = ? LIMIT 1",
      [hashed, normalized],
      (err, result) => {
        if (err) {
          console.error(err.message);
          process.exit(1);
        }
        if (!result.affectedRows) {
          console.error(`No user: ${normalized}`);
          process.exit(1);
        }
        console.log(`OK: ${normalized} → password 1234 (bcrypt). Restart API if needed.`);
        process.exit(0);
      }
    );
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
