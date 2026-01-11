#!/usr/bin/env node

/**
 * Script to add Microsoft Todo columns to the users table
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function addMicrosoftTodoColumns() {
    try {
        console.log('Adding Microsoft Todo columns to users table...');

        // Check if database exists
        await sequelize.authenticate();
        console.log('✅ Database connection successful');

        // Add columns one by one
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN microsoft_todo_access_token TEXT;
        `);
        console.log('✅ Added microsoft_todo_access_token column');

        await sequelize.query(`
            ALTER TABLE users ADD COLUMN microsoft_todo_refresh_token TEXT;
        `);
        console.log('✅ Added microsoft_todo_refresh_token column');

        await sequelize.query(`
            ALTER TABLE users ADD COLUMN microsoft_todo_expires_at DATETIME;
        `);
        console.log('✅ Added microsoft_todo_expires_at column');

        await sequelize.query(`
            ALTER TABLE users ADD COLUMN microsoft_todo_connected BOOLEAN DEFAULT 0;
        `);
        console.log('✅ Added microsoft_todo_connected column');

        console.log('✅ All Microsoft Todo columns added successfully');
        process.exit(0);
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  Columns already exist, skipping...');
            process.exit(0);
        }
        console.error('❌ Error adding columns:', error.message);
        process.exit(1);
    }
}

addMicrosoftTodoColumns();
