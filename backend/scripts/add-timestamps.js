#!/usr/bin/env node

/**
 * Add timestamp columns to tasks table
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function addTimestamps() {
    try {
        console.log('Adding timestamp columns to tasks table...');
        
        // Check if columns already exist
        const [results] = await sequelize.query("PRAGMA table_info(tasks);");
        const hasCreatedAt = results.some(col => col.name === 'createdAt');
        const hasUpdatedAt = results.some(col => col.name === 'updatedAt');
        
        if (!hasCreatedAt) {
            await sequelize.query("ALTER TABLE tasks ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;");
            console.log('✅ Added createdAt column');
        } else {
            console.log('ℹ️  createdAt column already exists');
        }
        
        if (!hasUpdatedAt) {
            await sequelize.query("ALTER TABLE tasks ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;");
            console.log('✅ Added updatedAt column');
        } else {
            console.log('ℹ️  updatedAt column already exists');
        }
        
        // Update existing records to have proper timestamps
        await sequelize.query("UPDATE tasks SET createdAt = COALESCE(createdAt, CURRENT_TIMESTAMP) WHERE createdAt IS NULL;");
        await sequelize.query("UPDATE tasks SET updatedAt = COALESCE(updatedAt, CURRENT_TIMESTAMP) WHERE updatedAt IS NULL;");
        
        console.log('✅ Timestamp columns added successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding timestamp columns:', error.message);
        process.exit(1);
    }
}

addTimestamps();
