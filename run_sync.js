require("dotenv").config();
const db = require("./config/db");

const dedupeQuery = `
-- Fill missing roll numbers with a safe fallback if roll_number is missing
UPDATE student
SET roll_number = CONCAT('AUTO', student_id)
WHERE roll_number IS NULL OR TRIM(roll_number) = '';

-- Ensure no duplicate roll_numbers (explicit check for future fixes)
`;

const insertQuery = `
INSERT IGNORE INTO users (login_id, password, role, reference_id)
SELECT s.roll_number, '1234', 'Student', s.student_id
FROM student s
LEFT JOIN users u ON u.login_id = s.roll_number AND u.role = 'Student'
WHERE u.user_id IS NULL
`;

const verifyQuery = `
SELECT 
    (SELECT COUNT(*) FROM student) AS total_students,
    (SELECT COUNT(*) FROM users WHERE role = 'Student') AS student_users,
    (SELECT COUNT(*) FROM student WHERE roll_number IS NULL OR TRIM(roll_number) = '') AS students_with_missing_roll
`;

db.query(dedupeQuery, (dedupeErr) => {
    if (dedupeErr) {
        console.error("Dedupe roll number error:", dedupeErr);
        process.exit(1);
    }

    db.query(insertQuery, (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            process.exit(1);
        } else {
            console.log("Inserted users:", result.affectedRows);
            
            db.query(verifyQuery, (err2, result2) => {
                if (err2) {
                    console.error("Verify error:", err2);
                } else {
                    console.log("Verification:", result2[0]);
                }
                process.exit();
            });
        }
    });
});