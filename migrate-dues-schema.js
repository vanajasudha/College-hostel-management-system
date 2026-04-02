const db = require('./config/db');

const schema = `
CREATE TABLE IF NOT EXISTS dues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  month VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const sample = [
  [1, 'January', 2026, 'hostel', 5200, 'unpaid'],
  [1, 'January', 2026, 'electricity', 2600, 'unpaid'],
  [2, 'January', 2026, 'hostel', 6000, 'paid'],
  [2, 'January', 2026, 'electricity', 1800, 'paid']
];

db.query(schema, (err) => {
  if (err) return console.error('Schema create error', err);
  console.log('dues table ensured');

  const insert = 'INSERT IGNORE INTO dues (student_id, month, year, category, amount, status) VALUES ?';
  db.query(insert, [sample], (err2, result) => {
    if (err2) return console.error('sample insert error', err2);
    console.log('sample rows inserted', result.affectedRows);
    process.exit(0);
  });
});
