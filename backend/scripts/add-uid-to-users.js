#!/usr/bin/env node

/**
 * Script to add uid column to users table if it doesn't exist
 * This fixes the issue where the migration was a no-op but the column is needed
 */

require('dotenv').config({
    path: require('path').join(__dirname, '..', '..', '.env'),
});
const { sequelize } = require('../models');
const { uid } = require('../utils/uid');

async function addUidToUsers() {
    try {
        const dialect = sequelize.getDialect();
        console.log(`Adding uid column to users table (${dialect})...`);

        // Check if uid column exists
        const [results] = await sequelize.query(
            dialect === 'mysql'
                ? "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'uid'"
                : dialect === 'postgres'
                  ? "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'uid'"
                  : 'PRAGMA table_info(users)'
        );

        let uidExists = false;
        if (dialect === 'sqlite') {
            uidExists = results.some((col) => col.name === 'uid');
        } else {
            uidExists = results.length > 0;
        }

        if (uidExists) {
            console.log('✅ uid column already exists in users table');
            process.exit(0);
        }

        // Add uid column
        console.log('Adding uid column...');
        await sequelize.query(
            dialect === 'mysql'
                ? 'ALTER TABLE users ADD COLUMN uid VARCHAR(255) NULL'
                : dialect === 'postgres'
                  ? 'ALTER TABLE users ADD COLUMN uid VARCHAR(255) NULL'
                  : 'ALTER TABLE users ADD COLUMN uid TEXT'
        );

        // Populate uid for existing users
        const users = await sequelize.query(
            'SELECT id FROM users WHERE uid IS NULL',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`Populating uid for ${users.length} existing users...`);
        for (const user of users) {
            const uniqueId = uid();
            await sequelize.query('UPDATE users SET uid = ? WHERE id = ?', {
                replacements: [uniqueId, user.id],
            });
        }

        // Make uid NOT NULL and UNIQUE
        console.log('Making uid column NOT NULL and UNIQUE...');
        if (dialect === 'mysql') {
            await sequelize.query(
                'ALTER TABLE users MODIFY COLUMN uid VARCHAR(255) NOT NULL'
            );
            await sequelize.query(
                'ALTER TABLE users ADD UNIQUE INDEX users_uid_unique (uid)'
            );
        } else if (dialect === 'postgres') {
            await sequelize.query(
                'ALTER TABLE users ALTER COLUMN uid SET NOT NULL'
            );
            await sequelize.query(
                'CREATE UNIQUE INDEX users_uid_unique ON users(uid)'
            );
        } else {
            // SQLite
            await sequelize.query('PRAGMA foreign_keys = OFF');
            // SQLite requires table recreation for NOT NULL and UNIQUE
            // This is complex, so we'll just add a unique index
            await sequelize.query(
                'CREATE UNIQUE INDEX IF NOT EXISTS users_uid_unique ON users(uid)'
            );
            await sequelize.query('PRAGMA foreign_keys = ON');
        }

        console.log('✅ Successfully added uid column to users table');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding uid column:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addUidToUsers();
