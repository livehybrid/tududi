'use strict';

/**
 * Migration to rename 'password' column to 'password_digest' to match the User model
 * This migration handles both new installations (where password_digest already exists)
 * and existing installations (where password column needs to be renamed)
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();
        const tableInfo = await queryInterface.describeTable('users');

        // Check if password_digest already exists (new installations or already migrated)
        if (tableInfo.password_digest) {
            console.log(
                'password_digest column already exists, skipping migration'
            );

            // If password column also exists, remove it
            if (tableInfo.password) {
                console.log('Removing old password column...');
                const dialect = queryInterface.sequelize.getDialect();

                if (dialect === 'sqlite') {
                    await queryInterface.sequelize.query(
                        'PRAGMA foreign_keys = OFF'
                    );
                }

                await queryInterface.removeColumn('users', 'password');

                if (dialect === 'sqlite') {
                    await queryInterface.sequelize.query(
                        'PRAGMA foreign_keys = ON'
                    );
                }
            }
            return;
        }

        // Check if password column exists (needs to be renamed)
        if (tableInfo.password) {
            console.log('Renaming password column to password_digest...');

            if (dialect === 'sqlite') {
                // SQLite doesn't support renameColumn directly, need to recreate table
                await queryInterface.sequelize.query(
                    'PRAGMA foreign_keys = OFF'
                );

                // Create new table with password_digest
                await queryInterface.sequelize.query(`
                    CREATE TABLE users_new AS 
                    SELECT id, email, password as password_digest, telegram_bot_token, telegram_chat_id,
                           task_summary_enabled, task_summary_frequency, task_summary_last_run, task_summary_next_run,
                           created_at, updated_at
                    FROM users
                `);

                // Drop old table and rename new one
                await queryInterface.dropTable('users');
                await queryInterface.sequelize.query(
                    'ALTER TABLE users_new RENAME TO users'
                );

                await queryInterface.sequelize.query(
                    'PRAGMA foreign_keys = ON'
                );
            } else {
                // MySQL/PostgreSQL support renameColumn
                await queryInterface.renameColumn(
                    'users',
                    'password',
                    'password_digest'
                );
            }
        } else {
            // Neither column exists - this shouldn't happen, but add password_digest
            console.log(
                'Neither password nor password_digest exists, adding password_digest...'
            );
            await queryInterface.addColumn('users', 'password_digest', {
                type: Sequelize.STRING,
                allowNull: false,
            });
        }
    },

    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('users');

        if (tableInfo.password_digest && !tableInfo.password) {
            const dialect = queryInterface.sequelize.getDialect();

            if (dialect === 'sqlite') {
                await queryInterface.sequelize.query(
                    'PRAGMA foreign_keys = OFF'
                );
                await queryInterface.sequelize.query(`
                    CREATE TABLE users_new AS 
                    SELECT id, email, password_digest as password, telegram_bot_token, telegram_chat_id,
                           task_summary_enabled, task_summary_frequency, task_summary_last_run, task_summary_next_run,
                           created_at, updated_at
                    FROM users
                `);
                await queryInterface.dropTable('users');
                await queryInterface.sequelize.query(
                    'ALTER TABLE users_new RENAME TO users'
                );
                await queryInterface.sequelize.query(
                    'PRAGMA foreign_keys = ON'
                );
            } else {
                await queryInterface.renameColumn(
                    'users',
                    'password_digest',
                    'password'
                );
            }
        }
    },
};
