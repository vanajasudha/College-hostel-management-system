const db = require("./config/db");

const queries = [
    `ALTER TABLE complaint ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'`,
    `ALTER TABLE complaint ADD COLUMN assigned_to VARCHAR(50) NULL`,
    `ALTER TABLE complaint ADD COLUMN remarks TEXT NULL`,
    `DROP TABLE IF EXISTS notifications`,
    `CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        warden_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warden_id) REFERENCES warden(warden_id)
    )`
];

async function run() {
    for (let q of queries) {
        try {
            await new Promise((resolve, reject) => {
                db.query(q, (err) => {
                    if (err && !err.message.includes('Duplicate column name')) {
                        console.error('Error on query:', q, '\\n', err.message);
                    }
                    resolve();
                });
            });
        } catch (e) {}
    }
    console.log("Migrations complete.");
    process.exit(0);
}

run();
