const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hostel_db',
});

db.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  db.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `, [process.env.DB_NAME || 'hostel_db'], (err, cols) => {
    if (err) throw err;
    db.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME || 'hostel_db'], (err, fks) => {
      if (err) throw err;
      fs.writeFileSync('db_schema_fs.json', JSON.stringify({ cols, fks }, null, 2), 'utf8');
      process.exit(0);
    });
  });
});
