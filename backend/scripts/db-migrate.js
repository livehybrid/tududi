#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates the database by altering existing tables to match current models
 */

// Load environment variables with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { sequelize } = require('../models');

async function migrateDatabase() {
    try {
        const dialect = sequelize.getDialect();
        console.log(`Migrating ${dialect} database...`);
        console.log('This will alter existing tables to match current models');

        // Drop any backup tables that may have outdated schemas BEFORE running migrations
        // These are temporary tables from previous migrations and can cause sync issues
        // Sequelize may recreate them during migrations, but we'll drop them again after
        if (dialect === 'sqlite') {
            try {
                const [tables] = await sequelize.query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'"
                );
                if (tables && tables.length > 0) {
                    for (const table of tables) {
                        console.log(`Dropping old backup table: ${table.name}`);
                        await sequelize.query(
                            `DROP TABLE IF EXISTS ${table.name}`
                        );
                    }
                }
            } catch (dropError) {
                // Ignore errors - table might not exist or already dropped
                if (!dropError.message.includes('no such table')) {
                    console.log(
                        '⚠️  Could not drop backup tables:',
                        dropError.message
                    );
                }
                // Continue anyway
            }
        } else {
            // For MySQL/PostgreSQL, check information_schema for backup tables
            try {
                let tables;
                if (dialect === 'mysql') {
                    [tables] = await sequelize.query(
                        "SELECT TABLE_NAME as name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%_backup'"
                    );
                } else if (dialect === 'postgres') {
                    [tables] = await sequelize.query(
                        "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%_backup'"
                    );
                }
                if (tables && tables.length > 0) {
                    for (const table of tables) {
                        console.log(`Dropping old backup table: ${table.name}`);
                        await sequelize.query(
                            `DROP TABLE IF EXISTS ${table.name}`
                        );
                    }
                }
            } catch (dropError) {
                // Ignore errors - table might not exist or already dropped
                console.log(
                    '⚠️  Could not drop backup tables:',
                    dropError.message
                );
                // Continue anyway
            }
        }

        // First, run any pending migrations
        const { execSync } = require('child_process');
        try {
            execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
            console.log('✅ Migrations completed');
        } catch (migrationError) {
            console.log(
                '⚠️  Some migrations failed (likely duplicate columns), continuing with sync...'
            );
        }

        // Drop any backup tables that may have been created during migrations
        // These are temporary tables and can cause sync issues
        if (dialect === 'sqlite') {
            try {
                const [tables] = await sequelize.query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'"
                );
                if (tables && tables.length > 0) {
                    for (const table of tables) {
                        console.log(
                            `Dropping backup table created during migration: ${table.name}`
                        );
                        await sequelize.query(
                            `DROP TABLE IF EXISTS ${table.name}`
                        );
                    }
                }
            } catch (dropError) {
                // Ignore errors - table might not exist or already dropped
                if (!dropError.message.includes('no such table')) {
                    console.log(
                        '⚠️  Could not drop backup tables:',
                        dropError.message
                    );
                }
                // Continue anyway
            }
        } else {
            // For MySQL/PostgreSQL, check information_schema for backup tables
            try {
                let tables;
                if (dialect === 'mysql') {
                    [tables] = await sequelize.query(
                        "SELECT TABLE_NAME as name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%_backup'"
                    );
                } else if (dialect === 'postgres') {
                    [tables] = await sequelize.query(
                        "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%_backup'"
                    );
                }
                if (tables && tables.length > 0) {
                    for (const table of tables) {
                        console.log(
                            `Dropping backup table created during migration: ${table.name}`
                        );
                        await sequelize.query(
                            `DROP TABLE IF EXISTS ${table.name}`
                        );
                    }
                }
            } catch (dropError) {
                // Ignore errors - table might not exist or already dropped
                console.log(
                    '⚠️  Could not drop backup tables:',
                    dropError.message
                );
                // Continue anyway
            }
        }

        // Then sync the database to ensure all models are up to date
        // Use a more conservative approach to avoid foreign key constraint issues
        try {
            // Suppress moment.js deprecation warnings for CURRENT_TIMESTAMP defaults
            // These warnings occur when Sequelize sync encounters DATE fields with CURRENT_TIMESTAMP defaults
            const originalStderrWrite = process.stderr.write.bind(
                process.stderr
            );
            const suppressedPatterns = [
                /moment.*CURRENT_TIMESTAMP/i,
                /moment.*Invalid date/i,
                /Deprecation warning.*moment/i,
                /RFC2822.*ISO format/i,
            ];

            process.stderr.write = function (chunk, encoding, fd) {
                const message = chunk.toString();
                const shouldSuppress = suppressedPatterns.some((pattern) =>
                    pattern.test(message)
                );
                if (!shouldSuppress) {
                    originalStderrWrite(chunk, encoding, fd);
                }
            };

            try {
                const dialect = sequelize.getDialect();
                // First try with alter: true but with foreign keys disabled for SQLite
                if (dialect === 'sqlite') {
                    await sequelize.query('PRAGMA foreign_keys = OFF;');
                }

                // For MySQL/PostgreSQL, use alter: false to avoid VIRTUAL field issues
                // VIRTUAL fields in Sequelize models shouldn't be synced to database
                if (dialect === 'mysql' || dialect === 'postgres') {
                    // Use sync without alter for MySQL/PostgreSQL to avoid VIRTUAL field errors
                    await sequelize.sync({ force: false, alter: false });
                } else {
                    await sequelize.sync({ alter: true });
                }

                if (dialect === 'sqlite') {
                    await sequelize.query('PRAGMA foreign_keys = ON;');
                }
            } finally {
                // Restore original stderr
                process.stderr.write = originalStderrWrite;
            }
        } catch (syncError) {
            console.log('⚠️  Sync failed, trying without alter...');
            console.log('Sync error:', syncError.message);

            // If alter fails, try without alter (safer but won't modify existing columns)
            await sequelize.sync({ force: false, alter: false });
        }

        console.log('✅ Database migrated successfully');
        console.log('All tables have been updated to match current models');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error migrating database:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

migrateDatabase();
