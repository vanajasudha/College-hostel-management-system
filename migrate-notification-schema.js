const db = require('./config/db');

const queries = [
  `DROP TABLE IF EXISTS notifications`,
  `CREATE TABLE notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('fee','room','complaint','general') DEFAULT 'general',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_student_id (student_id),
      INDEX idx_created_at (created_at),
      UNIQUE KEY uniq_noti (student_id, title, message, type)
    )`,
  `ALTER TABLE notifications ADD CONSTRAINT fk_notifications_student FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE ON UPDATE CASCADE`
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

  console.log('Notification schema migration complete.');
  process.exit(0);
}

run();