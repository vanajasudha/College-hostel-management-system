require('dotenv').config();
const db = require('./config/db');
const q = (s,p=[]) => new Promise((r,j) => db.query(s,p,(e,res) => e ? j(e) : r(res)));
(async () => {
  try {
    const noRoll = await q('SELECT COUNT(*) as c FROM student WHERE roll_number IS NULL OR TRIM(roll_number)=""');
    console.log('missing roll_number:', noRoll[0].c);
    const noUser = await q("SELECT COUNT(*) as c FROM student s WHERE roll_number IS NOT NULL AND TRIM(roll_number) <> '' AND NOT EXISTS(SELECT 1 FROM users u WHERE u.login_id = s.roll_number AND u.role = 'Student')");
    console.log('students without user:', noUser[0].c);
    const rows = await q("SELECT student_id, roll_number FROM student s WHERE roll_number IS NOT NULL AND TRIM(roll_number) <> '' AND NOT EXISTS(SELECT 1 FROM users u WHERE u.login_id = s.roll_number AND u.role = 'Student') LIMIT 20");
    console.log('sample missing student rows:', rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
})();
