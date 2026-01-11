#!/usr/bin/env node

/**
 * Database Initialization Script
 * Initializes the database by creating all tables and dropping existing data
 */

// Load environment variables with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { sequelize } = require('../models');

async function initDatabase() {
    try {
        const dialect = sequelize.getDialect();
        console.log(`Initializing ${dialect} database...`);
        console.log('WARNING: This will drop all existing data!');

        await sequelize.sync({ force: true });

        console.log('✅ Database initialized successfully');
        console.log(
            'All tables have been created and existing data has been cleared'
        );
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        process.exit(1);
    }
}

initDatabase();
