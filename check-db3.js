require("dotenv").config();
const db = require("./config/db");
db.query("SELECT * FROM payment LIMIT 1", (err, res) => {
    if (err) console.error("SELECT ERROR:", err);
    else console.log("PAYMENT ROW:", JSON.stringify(res, null, 2));
    process.exit();
});
