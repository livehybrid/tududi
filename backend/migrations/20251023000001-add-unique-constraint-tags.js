'use strict';

const { safeAddIndex } = require('../utils/migration-utils');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // CRITICAL: Disable foreign keys BEFORE starting transaction (SQLite only)
        // (SQLite requires this to be set outside of a transaction)
        const dialect = queryInterface.sequelize.getDialect();
        if (dialect === 'sqlite') {
            await queryInterface.sequelize.query('PRAGMA foreign_keys = OFF;');
        }

        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Step 0: Count original rows for verification
            const [originalCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tags;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(`📊 Original tags count: ${originalCount.count}`);

            // Step 1: Remove duplicate tags per user (keep oldest)
            const dialect = queryInterface.sequelize.getDialect();

            let duplicatesResult;
            if (dialect === 'mysql') {
                // MySQL requires wrapping the subquery in another SELECT
                [duplicatesResult] = await queryInterface.sequelize.query(
                    `
                    SELECT COUNT(*) as count FROM tags
                    WHERE id NOT IN (
                        SELECT id FROM (
                            SELECT MIN(id) as id
                            FROM tags
                            GROUP BY user_id, name
                        ) AS temp
                    );
                `,
                    { transaction, type: Sequelize.QueryTypes.SELECT }
                );
            } else {
                // SQLite and PostgreSQL can use the simpler query
                [duplicatesResult] = await queryInterface.sequelize.query(
                    `
                    SELECT COUNT(*) as count FROM tags
                    WHERE id NOT IN (
                        SELECT MIN(id)
                        FROM tags
                        GROUP BY user_id, name
                    );
                `,
                    { transaction, type: Sequelize.QueryTypes.SELECT }
                );
            }
            console.log(
                `🔍 Found ${duplicatesResult.count} duplicate tags to remove`
            );

            // Delete duplicates using dialect-appropriate query
            if (dialect === 'mysql') {
                // MySQL requires wrapping the subquery in another SELECT
                await queryInterface.sequelize.query(
                    `
                    DELETE FROM tags
                    WHERE id NOT IN (
                        SELECT id FROM (
                            SELECT MIN(id) as id
                            FROM tags
                            GROUP BY user_id, name
                        ) AS temp
                    )
                `,
                    { transaction }
                );
            } else {
                // SQLite and PostgreSQL can use the simpler query
                await queryInterface.sequelize.query(
                    `
                    DELETE FROM tags
                    WHERE id NOT IN (
                        SELECT MIN(id)
                        FROM tags
                        GROUP BY user_id, name
                    )
                `,
                    { transaction }
                );
            }

            // Step 1.5: Verify count after deduplication
            const [afterDedup] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tags;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(`📊 After deduplication: ${afterDedup.count} tags`);

            // Step 2: Create new tags table with correct schema
            // Drop tags_new if it exists from a previous failed migration
            await queryInterface.sequelize.query(
                'DROP TABLE IF EXISTS tags_new;',
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                CREATE TABLE tags_new (
                    id INTEGER PRIMARY KEY,
                    uid VARCHAR(255) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users (id),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                );
            `,
                { transaction }
            );

            // Step 3: Copy existing data
            await queryInterface.sequelize.query(
                `
                INSERT INTO tags_new (id, uid, name, user_id, created_at, updated_at)
                SELECT id, uid, name, user_id, created_at, updated_at
                FROM tags;
            `,
                { transaction }
            );

            // Step 3.5: Verify data was copied correctly
            const [newCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tags_new;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(`📊 Copied to new table: ${newCount.count} tags`);

            if (newCount.count !== afterDedup.count) {
                throw new Error(
                    `Data verification failed! Expected ${afterDedup.count} tags but found ${newCount.count} in new table`
                );
            }

            // Step 3.6: Verify all UIDs were copied
            const [uidCheck] = await queryInterface.sequelize.query(
                `
                SELECT COUNT(*) as count FROM tags t
                WHERE NOT EXISTS (
                    SELECT 1 FROM tags_new tn WHERE tn.uid = t.uid
                );
            `,
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );

            if (uidCheck.count > 0) {
                throw new Error(
                    `Data verification failed! ${uidCheck.count} tags were not copied to new table`
                );
            }

            console.log(
                '✅ Data verification passed - all tags copied correctly'
            );

            // Step 3.7: Save junction table data before dropping old tags table
            await queryInterface.sequelize.query(
                `
                CREATE TABLE projects_tags_backup AS
                SELECT * FROM projects_tags;
            `,
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                CREATE TABLE tasks_tags_backup AS
                SELECT * FROM tasks_tags;
            `,
                { transaction }
            );

            const [projectsTagsBackupCount] =
                await queryInterface.sequelize.query(
                    'SELECT COUNT(*) as count FROM projects_tags_backup;',
                    { transaction, type: Sequelize.QueryTypes.SELECT }
                );
            const [tasksTagsBackupCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tasks_tags_backup;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(
                `📦 Backed up junction tables: ${projectsTagsBackupCount.count} project tags, ${tasksTagsBackupCount.count} task tags`
            );

            // Step 4: Drop foreign key constraints for MySQL before dropping tags table
            if (dialect === 'mysql') {
                // Get foreign key constraint names
                const fkConstraints = await queryInterface.sequelize.query(
                    `
                    SELECT CONSTRAINT_NAME, TABLE_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE REFERENCED_TABLE_NAME = 'tags'
                    AND TABLE_SCHEMA = DATABASE()
                    `,
                    { transaction, type: Sequelize.QueryTypes.SELECT }
                );

                // Drop foreign key constraints from junction tables
                for (const fk of fkConstraints) {
                    try {
                        await queryInterface.sequelize.query(
                            `ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
                            { transaction }
                        );
                        console.log(
                            `Dropped foreign key ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`
                        );
                    } catch (error) {
                        console.log(
                            `Could not drop foreign key ${fk.CONSTRAINT_NAME}: ${error.message}`
                        );
                    }
                }
            }

            // Step 5: Drop old table
            await queryInterface.sequelize.query('DROP TABLE tags;', {
                transaction,
            });

            // Step 6: Rename new table
            await queryInterface.sequelize.query(
                'ALTER TABLE tags_new RENAME TO tags;',
                { transaction }
            );

            // Step 7: Recreate foreign key constraints for MySQL
            if (dialect === 'mysql') {
                // Recreate foreign keys for tasks_tags
                try {
                    await queryInterface.sequelize.query(
                        `
                        ALTER TABLE tasks_tags
                        ADD CONSTRAINT tasks_tags_ibfk_2
                        FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE CASCADE ON UPDATE CASCADE
                    `,
                        { transaction }
                    );
                } catch (error) {
                    console.log(
                        `Could not recreate tasks_tags foreign key: ${error.message}`
                    );
                }

                // Recreate foreign keys for projects_tags
                try {
                    await queryInterface.sequelize.query(
                        `
                        ALTER TABLE projects_tags
                        ADD CONSTRAINT projects_tags_ibfk_2
                        FOREIGN KEY (tag_id) REFERENCES tags(id)
                        ON DELETE CASCADE ON UPDATE CASCADE
                    `,
                        { transaction }
                    );
                } catch (error) {
                    console.log(
                        `Could not recreate projects_tags foreign key: ${error.message}`
                    );
                }

                // Recreate foreign keys for notes_tags if it exists
                try {
                    const tables = await queryInterface.showAllTables();
                    if (tables.includes('notes_tags')) {
                        await queryInterface.sequelize.query(
                            `
                            ALTER TABLE notes_tags
                            ADD CONSTRAINT notes_tags_ibfk_2
                            FOREIGN KEY (tag_id) REFERENCES tags(id)
                            ON DELETE CASCADE ON UPDATE CASCADE
                        `,
                            { transaction }
                        );
                    }
                } catch (error) {
                    console.log(
                        `Could not recreate notes_tags foreign key: ${error.message}`
                    );
                }
            }

            // Step 8: Create composite unique index
            // Note: safeAddIndex doesn't support transactions, so we'll use try/catch
            try {
                await queryInterface.addIndex('tags', ['user_id', 'name'], {
                    unique: true,
                    name: 'tags_user_id_name_unique',
                    transaction,
                });
            } catch (error) {
                if (
                    !error.message.includes('Duplicate') &&
                    !error.message.includes('already exists')
                ) {
                    throw error;
                }
            }

            // Step 9: Create index on user_id for performance
            try {
                await queryInterface.addIndex('tags', ['user_id'], {
                    name: 'tags_user_id',
                    transaction,
                });
            } catch (error) {
                if (
                    !error.message.includes('Duplicate') &&
                    !error.message.includes('already exists')
                ) {
                    throw error;
                }
            }

            // Step 10: Restore junction table data
            await queryInterface.sequelize.query(
                `
                DELETE FROM projects_tags;
            `,
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                INSERT INTO projects_tags (project_id, tag_id, created_at, updated_at)
                SELECT project_id, tag_id, created_at, updated_at
                FROM projects_tags_backup;
            `,
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                DELETE FROM tasks_tags;
            `,
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                INSERT INTO tasks_tags (task_id, tag_id, created_at, updated_at)
                SELECT task_id, tag_id, created_at, updated_at
                FROM tasks_tags_backup;
            `,
                { transaction }
            );

            // Step 7.6: Drop backup tables
            await queryInterface.sequelize.query(
                'DROP TABLE projects_tags_backup;',
                { transaction }
            );

            await queryInterface.sequelize.query(
                'DROP TABLE tasks_tags_backup;',
                { transaction }
            );

            console.log('✅ Restored junction table data');

            // Step 8: Final verification
            const [finalCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tags;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(`📊 Final tags count: ${finalCount.count}`);

            if (finalCount.count !== afterDedup.count) {
                throw new Error(
                    `Final verification failed! Expected ${afterDedup.count} tags but found ${finalCount.count}`
                );
            }

            // Step 9: Verify junction tables still have their data
            const [projectsTagsCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM projects_tags;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            const [tasksTagsCount] = await queryInterface.sequelize.query(
                'SELECT COUNT(*) as count FROM tasks_tags;',
                { transaction, type: Sequelize.QueryTypes.SELECT }
            );
            console.log(
                `📊 Junction tables preserved: ${projectsTagsCount.count} project tags, ${tasksTagsCount.count} task tags`
            );

            await transaction.commit();

            // Re-enable foreign keys AFTER committing transaction (SQLite only)
            if (dialect === 'sqlite') {
                await queryInterface.sequelize.query(
                    'PRAGMA foreign_keys = ON;'
                );
            }

            console.log('✅ Successfully fixed tags table unique constraints');
            console.log(
                `✅ All ${finalCount.count} tags preserved (${duplicatesResult.count} duplicates removed)`
            );
        } catch (error) {
            await transaction.rollback();

            // Re-enable foreign keys even on error (must be done after rollback, SQLite only)
            if (dialect === 'sqlite') {
                try {
                    await queryInterface.sequelize.query(
                        'PRAGMA foreign_keys = ON;'
                    );
                } catch (pragmaError) {
                    console.error(
                        'Failed to re-enable foreign keys:',
                        pragmaError
                    );
                }
            }

            console.error('❌ Error fixing tags table:', error);
            console.error(
                '❌ Transaction rolled back - no changes were made to the database'
            );
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Reverting this migration would restore the broken schema
        // It's better to not support rollback for schema fixes
        console.warn(
            '⚠️  Cannot rollback this migration - it fixes a broken schema'
        );
        console.warn('⚠️  Please restore from backup if needed');
    },
};
