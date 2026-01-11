#!/usr/bin/env node

/**
 * Script to sync users table schema with the User model
 * Adds any missing columns that the model expects but the database doesn't have
 */

require('dotenv').config({
    path: require('path').join(__dirname, '..', '..', '.env'),
});
const { sequelize, User } = require('../models');
const { safeAddColumns } = require('../utils/migration-utils');

async function syncUsersSchema() {
    try {
        const dialect = sequelize.getDialect();
        const queryInterface = sequelize.getQueryInterface();

        console.log(`Syncing users table schema (${dialect})...`);

        // Get current table structure
        const tableInfo = await queryInterface.describeTable('users');
        const existingColumns = Object.keys(tableInfo);

        // Get model attributes
        const modelAttributes = User.rawAttributes;
        const modelColumns = Object.keys(modelAttributes);

        // Find missing columns
        const missingColumns = [];
        for (const columnName of modelColumns) {
            const attr = modelAttributes[columnName];

            // Skip virtual fields and fields that map to different column names
            if (attr.type && attr.type.toString().includes('VIRTUAL')) {
                continue;
            }

            // Check if column exists (handle field mapping)
            const dbColumnName = attr.field || columnName;
            if (!existingColumns.includes(dbColumnName)) {
                missingColumns.push({
                    name: dbColumnName,
                    definition: {
                        type: attr.type,
                        allowNull: attr.allowNull !== false, // Default to true if not specified
                        defaultValue: attr.defaultValue,
                        unique: attr.unique,
                    },
                });
            }
        }

        if (missingColumns.length === 0) {
            console.log('✅ All columns already exist in users table');
            process.exit(0);
        }

        console.log(`Found ${missingColumns.length} missing columns:`);
        missingColumns.forEach((col) => console.log(`  - ${col.name}`));

        // Add missing columns
        await safeAddColumns(queryInterface, 'users', missingColumns);

        console.log('✅ Successfully synced users table schema');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing users schema:', error.message);
        console.error(error);
        process.exit(1);
    }
}

syncUsersSchema();
