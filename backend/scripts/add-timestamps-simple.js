#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'development.sqlite3');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Check current table structure
db.all('PRAGMA table_info(tasks);', (err, rows) => {
    if (err) {
        console.error('Error checking table info:', err.message);
        process.exit(1);
    }

    console.log('Current columns:');
    rows.forEach((row) => {
        console.log(`  ${row.name} (${row.type})`);
    });

    const hasCreatedAt = rows.some((row) => row.name === 'createdAt');
    const hasUpdatedAt = rows.some((row) => row.name === 'updatedAt');

    console.log('\nHas createdAt:', hasCreatedAt);
    console.log('Has updatedAt:', hasUpdatedAt);

    if (!hasCreatedAt) {
        console.log('Adding createdAt column...');
        db.run(
            'ALTER TABLE tasks ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;',
            (err) => {
                if (err) {
                    console.error('Error adding createdAt:', err.message);
                } else {
                    console.log('✅ Added createdAt column');
                }
            }
        );
    }

    if (!hasUpdatedAt) {
        console.log('Adding updatedAt column...');
        db.run(
            'ALTER TABLE tasks ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;',
            (err) => {
                if (err) {
                    console.error('Error adding updatedAt:', err.message);
                } else {
                    console.log('✅ Added updatedAt column');
                }
            }
        );
    }

    // Update existing records
    console.log('Updating existing records...');
    db.run(
        'UPDATE tasks SET createdAt = COALESCE(createdAt, CURRENT_TIMESTAMP) WHERE createdAt IS NULL;',
        (err) => {
            if (err) {
                console.error('Error updating createdAt:', err.message);
            } else {
                console.log('✅ Updated createdAt values');
            }
        }
    );

    db.run(
        'UPDATE tasks SET updatedAt = COALESCE(updatedAt, CURRENT_TIMESTAMP) WHERE updatedAt IS NULL;',
        (err) => {
            if (err) {
                console.error('Error updating updatedAt:', err.message);
            } else {
                console.log('✅ Updated updatedAt values');
            }
        }
    );

    // Verify the columns work
    setTimeout(() => {
        db.all(
            'SELECT id, name, createdAt, updatedAt FROM tasks LIMIT 1;',
            (err, rows) => {
                if (err) {
                    console.error('Error verifying columns:', err.message);
                } else {
                    console.log('\n✅ Verification successful!');
                    console.log('Sample row:', rows[0]);
                }

                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('Database connection closed');
                    }
                    process.exit(0);
                });
            }
        );
    }, 1000);
});
