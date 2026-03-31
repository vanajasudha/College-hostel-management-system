const db = require('./config/db');

const queries = [
  `CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_created_at (created_at)
    )`
];

async function run() {
  for (const q of queries) {
    await new Promise((resolve) => {
      db.query(q, (err) => {
        if (err) {
          console.error('Error executing query:', q, '\n', err.message);
        } else {
          console.log('Success:', q.split('\n')[0].trim());
        }
        resolve();
      });
    });
  }

  console.log('Contact messages schema migration complete.');
  process.exit(0);
}

run();
