require("dotenv").config();
const db = require("./config/db");
const bcrypt = require("bcryptjs");

async function hashAllPasswords() {
  db.query("SELECT user_id, password FROM users", async (err, users) => {
    if (err) {
      console.log(err);
      return;
    }

    for (let user of users) {
      const hashed = await bcrypt.hash(user.password, 10);

      db.query(
        "UPDATE users SET password = ? WHERE user_id = ?",
        [hashed, user.user_id]
      );
    }

    console.log("All passwords hashed successfully 🔐");
  });
}

hashAllPasswords();