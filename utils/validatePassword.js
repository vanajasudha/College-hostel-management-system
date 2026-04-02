const bcrypt = require("bcrypt");

/** Set AUTH_DEBUG=1 when troubleshooting login (logs secrets — disable after debugging). */
const AUTH_DEBUG = process.env.AUTH_DEBUG === "1";

/**
 * @param {string} inputPassword
 * @param {string|Buffer|null|undefined} storedPassword
 * @returns {Promise<boolean>}
 */
async function validatePassword(inputPassword, storedPassword) {
  if (storedPassword == null || storedPassword === "") {
    return false;
  }

  const raw = Buffer.isBuffer(storedPassword)
    ? storedPassword.toString("utf8")
    : String(storedPassword);

  const clean = raw.replace(/^\uFEFF/, "").trim();

  if (!clean) {
    return false;
  }

  const input = String(inputPassword ?? "").trim();

  if (AUTH_DEBUG) {
    console.log("Stored password:", clean);
    console.log("Input password:", inputPassword);
  }

  // Plain text (legacy)
  if (input === clean) {
    return true;
  }

  if (
    clean.startsWith("$2a$") ||
    clean.startsWith("$2b$") ||
    clean.startsWith("$2y$")
  ) {
    try {
      return await bcrypt.compare(input, clean);
    } catch {
      return false;
    }
  }

  if (clean.startsWith("$") && clean.length >= 59) {
    try {
      return await bcrypt.compare(input, clean);
    } catch {
      return false;
    }
  }

  return false;
}

module.exports = { validatePassword };
