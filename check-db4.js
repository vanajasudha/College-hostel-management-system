require("dotenv").config();
const mysql = require("mysql2");
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
db.query("DESCRIBE payment", (err, res) => {
    console.log(JSON.stringify(res, null, 2));
    process.exit();
});
