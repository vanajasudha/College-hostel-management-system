const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Sudha@2006',
  database: 'hostel_db',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('MySQL Connected Successfully 🚀');

  const ensureColumn = (columnName, definition, callback) => {
    const checkColumn = `
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = DATABASE() AND table_name = 'payment' AND column_name = ?
    `;

    db.query(checkColumn, [columnName], (err, rows) => {
      if (err) return callback(err);
      if (rows[0].cnt > 0) {
        console.log(`✅ ${columnName} column already exists`);
        return callback(null);
      }

      db.query(`ALTER TABLE payment ADD COLUMN ${definition}`, (alterErr) => {
        if (alterErr) return callback(alterErr);
        console.log(`✅ ${columnName} column added`);
        callback(null);
      });
    });
  };

  ensureColumn('payment_type', "payment_type VARCHAR(50) NOT NULL DEFAULT 'Monthly Dues'", (err) => {
    if (err) {
      console.error('Failed to ensure payment_type column:', err.message);
      db.end();
      process.exit(1);
    }

    ensureColumn('category', "category VARCHAR(50) NOT NULL DEFAULT 'Hostel'", (err2) => {
      if (err2) {
        console.error('Failed to ensure category column:', err2.message);
        db.end();
        process.exit(1);
      }

      console.log('✅ Migration completed: payment_type & category available');
      db.end();
      process.exit(0);
    });
  });
});