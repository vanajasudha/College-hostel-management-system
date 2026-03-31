const db = require("./config/db");

const addPriority = `ALTER TABLE complaint ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'`;
const addAssignedTo = `ALTER TABLE complaint ADD COLUMN assigned_to VARCHAR(50) NULL`;
const addRemarks = `ALTER TABLE complaint ADD COLUMN remarks TEXT NULL`;

const modifyStudentNotification = `ALTER TABLE notifications MODIFY student_id INT NULL`;
const addWardenNotification = `ALTER TABLE notifications ADD COLUMN warden_id INT NULL`;
const addWardenFk = `ALTER TABLE notifications ADD FOREIGN KEY (warden_id) REFERENCES warden(warden_id)`;

// Execute them sequentially
db.query(addPriority, (e1) => {
    if (e1 && e1.code !== 'ER_DUP_FIELDNAME') console.error("Error priority:", e1);
    db.query(addAssignedTo, (e2) => {
        if (e2 && e2.code !== 'ER_DUP_FIELDNAME') console.error("Error assigned_to:", e2);
        db.query(addRemarks, (e3) => {
            if (e3 && e3.code !== 'ER_DUP_FIELDNAME') console.error("Error remarks:", e3);
            
            db.query(modifyStudentNotification, (e4) => {
                if (e4) console.error("Error student_id modify:", e4);
                
                db.query(addWardenNotification, (e5) => {
                    if (e5 && e5.code !== 'ER_DUP_FIELDNAME') console.error("Error warden_id:", e5);
                    db.query(addWardenFk, (e6) => {
                        if (e6 && !e6.message.includes('Duplicate foreign key')) console.error("Error warden FK:", e6);
                        
                        console.log("Warden migrations complete.");
                        process.exit(0);
                    });
                });
            });
        });
    });
});
