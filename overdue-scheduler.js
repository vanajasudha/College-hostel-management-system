const db = require('./config/db');
const cron = require('node-cron');

// Overdue Logic: Run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('[OVERDUE CHECK] Running daily overdue check...');

  const overdueQuery = `
    UPDATE dues
    SET status = 'overdue'
    WHERE status = 'unpaid'
    AND due_date < CURDATE()
  `;

  db.query(overdueQuery, (err, result) => {
    if (err) {
      console.error('[OVERDUE CHECK] Error updating overdue dues:', err);
      return;
    }

    const updatedCount = result.affectedRows;
    console.log(`[OVERDUE CHECK] Marked ${updatedCount} dues as overdue`);

    if (updatedCount > 0) {
      // Send overdue notifications
      const notificationQuery = `
        SELECT d.student_id, d.month, d.year, SUM(d.amount) as total_amount,
               s.name as student_name
        FROM dues d
        JOIN student s ON d.student_id = s.student_id
        WHERE d.status = 'overdue'
        AND d.due_date = CURDATE() - INTERVAL 1 DAY
        GROUP BY d.student_id, d.month, d.year, s.name
      `;

      db.query(notificationQuery, (notifErr, overdueStudents) => {
        if (notifErr) {
          console.error('[OVERDUE CHECK] Error fetching overdue students:', notifErr);
          return;
        }

        const notificationService = require('./utils/notificationService');

        overdueStudents.forEach(student => {
          const message = `⚠️ OVERDUE: Your dues for ${student.month} ${student.year} (₹${student.total_amount}) are now overdue. Please pay immediately to avoid penalties.`;

          notificationService.createNotification({
            student_id: student.student_id,
            title: 'Overdue Dues Alert',
            message,
            type: 'fee'
          }).catch(err => {
            console.error(`[OVERDUE CHECK] Failed to send notification to student ${student.student_id}:`, err);
          });
        });

        console.log(`[OVERDUE CHECK] Sent overdue notifications to ${overdueStudents.length} students`);
      });
    }
  });
});

// Reminder Logic: Run daily at 10 AM for dues due tomorrow
cron.schedule('0 10 * * *', () => {
  console.log('[REMINDER CHECK] Running daily reminder check...');

  const reminderQuery = `
    SELECT d.student_id, d.month, d.year, SUM(d.amount) as total_amount,
           s.name as student_name
    FROM dues d
    JOIN student s ON d.student_id = s.student_id
    WHERE d.status = 'unpaid'
    AND d.due_date = CURDATE() + INTERVAL 1 DAY
    GROUP BY d.student_id, d.month, d.year, s.name
  `;

  db.query(reminderQuery, (err, reminderStudents) => {
    if (err) {
      console.error('[REMINDER CHECK] Error fetching students for reminders:', err);
      return;
    }

    const notificationService = require('./utils/notificationService');

    reminderStudents.forEach(student => {
      const message = `⏰ REMINDER: Your dues for ${student.month} ${student.year} (₹${student.total_amount}) are due tomorrow (${student.due_date}). Please make payment to avoid late fees.`;

      notificationService.createNotification({
        student_id: student.student_id,
        title: 'Payment Due Reminder',
        message,
        type: 'fee'
      }).catch(err => {
        console.error(`[REMINDER CHECK] Failed to send reminder to student ${student.student_id}:`, err);
      });
    });

    console.log(`[REMINDER CHECK] Sent payment reminders to ${reminderStudents.length} students`);
  });
});

console.log('✅ Overdue and reminder cron jobs initialized');
console.log('   - Overdue check: Daily at 2:00 AM');
console.log('   - Payment reminders: Daily at 10:00 AM');

module.exports = cron;