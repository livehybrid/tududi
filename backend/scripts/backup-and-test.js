#!/usr/bin/env node

/**
 * Full database backup and test script
 *
 * Exports all users' data (or a single user if BACKUP_USER_ID is set),
 * saves backups, then validates them. Use for disaster recovery and
 * verifying backup integrity.
 *
 * Works with SQLite, PostgreSQL, and MySQL. Loads .env from backend/.env
 * and project root so DB_DIALECT and DB_* are picked up when using Postgres.
 *
 * Usage:
 *   NODE_ENV=development node scripts/backup-and-test.js
 *   BACKUP_USER_ID=1 node scripts/backup-and-test.js   # backup single user
 *
 * Requires FF_ENABLE_BACKUPS=true if using the backup API; this script
 * uses the backup service directly so it works without the flag.
 */

const path = require('path');

// Load .env from backend first, then project root (so root .env wins for DB_* when using Postgres)
const backendEnv = path.join(__dirname, '..', '.env');
const rootEnv = path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: backendEnv });
// Project root .env overrides so DB_DIALECT=postgres (and DB_*) from root are used
require('dotenv').config({ path: rootEnv });

// Ensure NODE_ENV so config does not exit (default to development for backup)
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

const { sequelize, User } = require('../models');
const {
    exportUserData,
    validateBackupData,
    checkVersionCompatibility,
    getBackupsDirectory,
    saveBackup,
} = require('../services/backupService');

async function backupAndTest() {
    const singleUserId = process.env.BACKUP_USER_ID
        ? parseInt(process.env.BACKUP_USER_ID, 10)
        : null;

    console.log('Backup and test\n');

    // Verify we're connected to the intended database (Postgres, MySQL, or SQLite)
    try {
        await sequelize.authenticate();
        const dialect = sequelize.getDialect();
        const dbName =
            dialect === 'sqlite'
                ? sequelize.config.storage || sequelize.options.storage
                : `${sequelize.config.host || 'localhost'}:${sequelize.config.port || (dialect === 'mysql' ? 3306 : 5432)}/${sequelize.config.database || 'tududi'}`;
        console.log(`Database: ${dialect} @ ${dbName}`);
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }

    console.log('Single user mode:', singleUserId ? `user id ${singleUserId}` : 'all users');

    const users = singleUserId
        ? await User.findAll({ where: { id: singleUserId }, attributes: ['id', 'email'] })
        : await User.findAll({ attributes: ['id', 'email'] });

    if (users.length === 0) {
        console.error(
            'No users found to backup. Check that you are connected to the correct database (e.g. set DB_DIALECT=postgres and DB_* in .env).'
        );
        process.exit(1);
    }

    const results = [];

    for (const user of users) {
        const userId = user.id;
        const email = user.email || `user-${userId}`;
        console.log(`\n--- Backing up user ${userId} (${email}) ---`);

        try {
            const backupData = await exportUserData(userId);
            const validation = validateBackupData(backupData);
            if (!validation.valid) {
                console.error('Validation failed:', validation.errors);
                results.push({ userId, email, success: false, error: validation.errors });
                continue;
            }

            const versionCheck = checkVersionCompatibility(backupData.version);
            if (!versionCheck.compatible) {
                console.error('Version check failed:', versionCheck.message);
                results.push({ userId, email, success: false, error: versionCheck.message });
                continue;
            }

            const backup = await saveBackup(userId, backupData);
            console.log('Saved backup:', backup.file_path, `(${(backup.file_size / 1024).toFixed(2)} KB)`);
            console.log('Counts:', backup.item_counts);

            results.push({
                userId,
                email,
                success: true,
                file_path: backup.file_path,
                file_size: backup.file_size,
                item_counts: backup.item_counts,
            });
        } catch (err) {
            console.error('Backup failed:', err.message);
            results.push({ userId, email, success: false, error: err.message });
        }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log('\n--- Summary ---');
    console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
    if (failed > 0) {
        results.filter((r) => !r.success).forEach((r) => {
            console.error(`  ${r.email}: ${r.error}`);
        });
        process.exit(1);
    }

    const backupsDir = await getBackupsDirectory();
    console.log('\nBackups directory:', backupsDir);
    console.log('Backup and test completed successfully.');
}

backupAndTest().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
