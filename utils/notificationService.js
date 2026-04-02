const db = require('../config/db');

module.exports = {
  createNotification: ({ student_id = null, title, message, type = 'general' }) => {
    return new Promise((resolve, reject) => {
      if (!title || !message || !type) {
        return reject(new Error('title, message and type are required for notification creation.'));
      }

      const checkStudent = (next) => {
        if (student_id === null || student_id === undefined) {
          return next();
        }

        db.query(`SELECT student_id FROM student WHERE student_id = ?`, [student_id], (stErr, stRes) => {
          if (stErr) return reject(stErr);
          if (!stRes.length) return reject(new Error(`Student ${student_id} not found`));
          next();
        });
      };

      checkStudent(() => {
        const checkQuery = `
          SELECT id
          FROM notifications
          WHERE student_id <=> ?
            AND title = ?
            AND message = ?
            AND type = ?
          LIMIT 1
        `;

        db.query(checkQuery, [student_id, title, message, type], (chkErr, chkRes) => {
          if (chkErr) return reject(chkErr);

          if (chkRes.length > 0) {
            return resolve({ created: false, reason: 'exists' });
          }

          const insertQuery = `
            INSERT INTO notifications (student_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, FALSE)
          `;

          db.query(insertQuery, [student_id, title, message, type], (insErr, insRes) => {
            if (insErr) {
              console.error('[NOTIFICATION] SQL Error creating notification:', insErr.message);
              console.error('[NOTIFICATION] Query:', insertQuery);
              console.error('[NOTIFICATION] Params:', [student_id, title, message, type]);
              return reject(insErr);
            }
            resolve({ created: true, notification_id: insRes.insertId });
          });
        });
      });
    });
  },

  createFeeReminderForStudent: (student_id) => {
    return new Promise((resolve, reject) => {
      if (!student_id) return reject(new Error('student_id is required.'));

      const duesQuery = `
        SELECT COALESCE(SUM(amount), 0) AS pending_amount
        FROM dues
        WHERE student_id = ? AND status = 'unpaid'
      `;

      db.query(duesQuery, [student_id], async (err, rows) => {
        if (err) return reject(err);

        const pendingAmount = Number(rows[0]?.pending_amount || 0);
        if (pendingAmount <= 0) {
          return resolve({ created: false, reason: 'no_pending_dues' });
        }

        try {
          const title = 'Pending Dues Reminder';
          const message = `You have pending dues of ₹${pendingAmount}. Please pay immediately.`;
          const result = await module.exports.createNotification({ student_id, title, message, type: 'fee' });
          resolve({ ...result, pendingAmount });
        } catch (e) {
          reject(e);
        }
      });
    });
  }
};