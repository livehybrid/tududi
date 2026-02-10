#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function fixTimestamps() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(__dirname, 'db', 'development.sqlite3');
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Check if columns exist
        db.all('PRAGMA table_info(tasks);', (err, rows) => {
            if (err) {
                console.error('Error checking table info:', err.message);
                reject(err);
                return;
            }

            const hasCreatedAt = rows.some((row) => row.name === 'createdAt');
            const hasUpdatedAt = rows.some((row) => row.name === 'updatedAt');

            console.log('Current columns:', rows.map((r) => r.name).join(', '));
            console.log('Has createdAt:', hasCreatedAt);
            console.log('Has updatedAt:', hasUpdatedAt);

            if (!hasCreatedAt) {
                db.run(
                    'ALTER TABLE tasks ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;',
                    (err) => {
                        if (err) {
                            console.error(
                                'Error adding createdAt:',
                                err.message
                            );
                        } else {
                            console.log('✅ Added createdAt column');
                        }
                    }
                );
            }

            if (!hasUpdatedAt) {
                db.run(
                    'ALTER TABLE tasks ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;',
                    (err) => {
                        if (err) {
                            console.error(
                                'Error adding updatedAt:',
                                err.message
                            );
                        } else {
                            console.log('✅ Added updatedAt column');
                        }
                    }
                );
            }

            // Update existing records
            db.run(
                'UPDATE tasks SET createdAt = COALESCE(createdAt, CURRENT_TIMESTAMP) WHERE createdAt IS NULL;',
                (err) => {
                    if (err) {
                        console.error('Error updating createdAt:', err.message);
                    } else {
                        console.log('✅ Updated existing createdAt values');
                    }
                }
            );

            db.run(
                'UPDATE tasks SET updatedAt = COALESCE(updatedAt, CURRENT_TIMESTAMP) WHERE updatedAt IS NULL;',
                (err) => {
                    if (err) {
                        console.error('Error updating updatedAt:', err.message);
                    } else {
                        console.log('✅ Updated existing updatedAt values');
                    }
                }
            );

            // Verify columns
            db.all(
                'SELECT id, name, createdAt, updatedAt FROM tasks LIMIT 1;',
                (err, rows) => {
                    if (err) {
                        console.error('Error verifying columns:', err.message);
                    } else {
                        console.log(
                            '✅ Verification successful. Sample row:',
                            rows[0]
                        );
                    }

                    db.close((err) => {
                        if (err) {
                            console.error(
                                'Error closing database:',
                                err.message
                            );
                        } else {
                            console.log('Database connection closed');
                        }
                        resolve();
                    });
                }
            );
        });
    });
}

fixTimestamps().catch(console.error);
