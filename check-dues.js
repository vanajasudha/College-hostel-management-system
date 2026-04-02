require('dotenv').config();
const db = require('./config/db');

console.log('Checking dues table...\n');

db.query('DESCRIBE dues', (err, result) => {
  if (err) {
    console.error('ERROR: Dues table does not exist or cannot be described');
    console.error(err.message);
    process.exit(1);
  } else {
    console.log('✓ Dues table exists with columns:');
    result.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check sample data
    db.query('SELECT COUNT(*) as count FROM dues', (err2, res2) => {
      if (err2) {
        console.error('ERROR: Could not count dues rows:', err2.message);
      } else {
        console.log(`\n✓ Dues table has ${res2[0].count} rows`);
      }
      
      // Check student dues
      db.query('SELECT student_id, COUNT(*) as due_count FROM dues GROUP BY student_id LIMIT 5', (err3, res3) => {
        if (err3) {
          console.error('ERROR: Could not fetch student dues:', err3.message);
        } else {
          console.log('\nSample student dues:');
          res3.forEach(row => {
            console.log(`  - Student ${row.student_id}: ${row.due_count} dues`);
          });
        }
        process.exit(0);
      });
    });
  }
});
