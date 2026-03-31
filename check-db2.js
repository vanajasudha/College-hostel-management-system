require("dotenv").config();
const db = require("./config/db");
db.query("DESCRIBE payment", (err, res) => {
    if (err) console.error("DESCRIBE payment ERRROR:", err);
    else console.log("PAYMENT SCHEMA:", JSON.stringify(res, null, 2));
    process.exit();
});
