#!/usr/bin/env node

/**
 * Script to set up the database with Microsoft Todo columns
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function setupDatabase() {
    try {
        console.log('Setting up database...');

        // First, sync the database to create all tables
        await sequelize.sync({ force: false });
        console.log('✅ Database tables created/updated');

        // Now add the Microsoft Todo columns if they don't exist
        try {
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN microsoft_todo_access_token TEXT;
            `);
            console.log('✅ Added microsoft_todo_access_token column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log(
                    '⚠️  microsoft_todo_access_token column already exists'
                );
            } else {
                throw error;
            }
        }

        try {
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN microsoft_todo_refresh_token TEXT;
            `);
            console.log('✅ Added microsoft_todo_refresh_token column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log(
                    '⚠️  microsoft_todo_refresh_token column already exists'
                );
            } else {
                throw error;
            }
        }

        try {
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN microsoft_todo_expires_at DATETIME;
            `);
            console.log('✅ Added microsoft_todo_expires_at column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log(
                    '⚠️  microsoft_todo_expires_at column already exists'
                );
            } else {
                throw error;
            }
        }

        try {
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN microsoft_todo_connected BOOLEAN DEFAULT 0;
            `);
            console.log('✅ Added microsoft_todo_connected column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log(
                    '⚠️  microsoft_todo_connected column already exists'
                );
            } else {
                throw error;
            }
        }

        console.log('✅ Database setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

setupDatabase();
