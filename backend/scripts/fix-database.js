#!/usr/bin/env node

/**
 * Script to fix the database by adding Microsoft Todo columns
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function fixDatabase() {
    try {
        console.log('Fixing database...');

        const dbPath = path.join(__dirname, '..', 'db', 'development.sqlite3');
        console.log('Database path:', dbPath);

        // Check if database exists
        const fs = require('fs');
        if (!fs.existsSync(dbPath)) {
            console.log('Database does not exist, creating...');
            // Create directory if it doesn't exist
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            // Create empty database file
            fs.writeFileSync(dbPath, '');
        }

        const db = new sqlite3.Database(dbPath);

        // Add columns one by one
        await new Promise((resolve, reject) => {
            db.run(
                `ALTER TABLE users ADD COLUMN microsoft_todo_access_token TEXT;`,
                (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        reject(err);
                    } else {
                        console.log(
                            '✅ Added microsoft_todo_access_token column'
                        );
                        resolve();
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            db.run(
                `ALTER TABLE users ADD COLUMN microsoft_todo_refresh_token TEXT;`,
                (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        reject(err);
                    } else {
                        console.log(
                            '✅ Added microsoft_todo_refresh_token column'
                        );
                        resolve();
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            db.run(
                `ALTER TABLE users ADD COLUMN microsoft_todo_expires_at DATETIME;`,
                (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        reject(err);
                    } else {
                        console.log(
                            '✅ Added microsoft_todo_expires_at column'
                        );
                        resolve();
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            db.run(
                `ALTER TABLE users ADD COLUMN microsoft_todo_connected BOOLEAN DEFAULT 0;`,
                (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        reject(err);
                    } else {
                        console.log('✅ Added microsoft_todo_connected column');
                        resolve();
                    }
                }
            );
        });

        db.close();
        console.log('✅ Database fixed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing database:', error.message);
        process.exit(1);
    }
}

fixDatabase();
