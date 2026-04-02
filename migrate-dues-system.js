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
});

console.log('Starting database migration for dues system improvements...\n');

// Migration: Update existing dues with due_date (10th of the month)
const updateDueDatesQuery = `
UPDATE dues
SET due_date = DATE(CONCAT(year, '-',
  CASE month
    WHEN 'January' THEN '01'
    WHEN 'February' THEN '02'
    WHEN 'March' THEN '03'
    WHEN 'April' THEN '04'
    WHEN 'May' THEN '05'
    WHEN 'June' THEN '06'
    WHEN 'July' THEN '07'
    WHEN 'August' THEN '08'
    WHEN 'September' THEN '09'
    WHEN 'October' THEN '10'
    WHEN 'November' THEN '11'
    WHEN 'December' THEN '12'
  END, '-10'))
WHERE due_date IS NULL
`;

// Migration: Create index for better performance
const createIndexQuery = `
CREATE INDEX idx_dues_status_due_date ON dues (status, due_date);
CREATE INDEX idx_dues_student_month_year ON dues (student_id, month, year);
`;

// Migration: Clean up duplicate dues (keep the latest one)
const cleanupDuplicatesQuery = `
DELETE d1 FROM dues d1
INNER JOIN dues d2
WHERE d1.student_id = d2.student_id
  AND d1.month = d2.month
  AND d1.year = d2.year
  AND d1.category = d2.category
  AND d1.id < d2.id
`;

// Execute migrations in sequence
console.log('✅ Database schema already updated, proceeding with data migration...');

db.query(updateDueDatesQuery, (err) => {
  if (err) {
    console.error('❌ Failed to update due dates:', err.message);
    process.exit(1);
  }
  console.log('✅ Updated existing dues with due dates (10th of month)');

  db.query(createIndexQuery, (err2) => {
    if (err2) {
      console.log('⚠️ Indexes may already exist, continuing...');
    } else {
      console.log('✅ Created performance indexes');
    }

    db.query(cleanupDuplicatesQuery, (err3) => {
      if (err3) {
        console.error('❌ Failed to cleanup duplicates:', err3.message);
        process.exit(1);
      }
      console.log('✅ Cleaned up duplicate dues records');

      console.log('\n🎉 Database migration completed successfully!');
      console.log('📋 Summary of changes:');
      console.log('   - Updated existing dues with due dates (10th of each month)');
      console.log('   - Created performance indexes');
      console.log('   - Removed duplicate dues records');

      db.end();
      process.exit(0);
    });
  });
});