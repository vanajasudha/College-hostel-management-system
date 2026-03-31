require("dotenv").config();
const db = require("./config/db");
db.query("SHOW TABLES", (err, result) => {
    if (err) console.error(err);
    else console.log(result);

    db.query("DESCRIBE payment", (err2, res2) => {
        if (err2) console.error("payment table error:", err2.message);
        else console.log("payment schema:", res2);
        
        db.query("DESCRIBE dues", (err3, res3) => {
            if (err3) console.error(err3.message);
            else console.log("dues schema:", res3);
            process.exit();
        });
    });
});
