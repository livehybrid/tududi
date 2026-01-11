'use strict';

/**
 * Migration to update project state ENUM to use task status values.
 * This aligns project states with task statuses for consistency.
 *
 * Old values: 'idea', 'planned', 'in_progress', 'blocked', 'completed'
 * New values: 'not_started', 'in_progress', 'done', 'waiting', 'cancelled', 'planned'
 *
 * Mapping:
 * - 'idea' → 'not_started'
 * - 'planned' → 'planned'
 * - 'in_progress' → 'in_progress'
 * - 'blocked' → 'waiting'
 * - 'completed' → 'done'
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // For SQLite: recreate the column with new values
        // For PostgreSQL/MySQL: alter the enum type

        const dialect = queryInterface.sequelize.getDialect();

        if (dialect === 'sqlite') {
            // SQLite doesn't support ENUM, it's stored as TEXT
            // Check if column is 'state' or 'status' (may have been renamed already)
            const tableInfo = await queryInterface.describeTable('projects');
            const columnName = tableInfo.status
                ? 'status'
                : tableInfo.state
                  ? 'state'
                  : null;

            if (!columnName) {
                console.log(
                    '⚠️  Neither state nor status column found in projects table, skipping migration'
                );
                return;
            }

            // Just update the data values
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'not_started' WHERE ${columnName} = 'idea'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'waiting' WHERE ${columnName} = 'blocked'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'done' WHERE ${columnName} = 'completed'`
            );
        } else if (dialect === 'postgres') {
            // PostgreSQL: Create new enum type, migrate data, swap types
            const tableInfo = await queryInterface.describeTable('projects');
            const columnName = tableInfo.status
                ? 'status'
                : tableInfo.state
                  ? 'state'
                  : null;

            if (!columnName) {
                console.log(
                    '⚠️  Neither state nor status column found in projects table, skipping migration'
                );
                return;
            }

            await queryInterface.sequelize.query(`
                CREATE TYPE "enum_projects_${columnName}_new" AS ENUM(
                    'not_started', 'in_progress', 'done', 'waiting', 'cancelled', 'planned'
                );
            `);

            // Update values before changing type
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'not_started' WHERE ${columnName} = 'idea'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'waiting' WHERE ${columnName} = 'blocked'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'done' WHERE ${columnName} = 'completed'`
            );

            // Change column type
            await queryInterface.sequelize.query(`
                ALTER TABLE projects
                ALTER COLUMN ${columnName} TYPE "enum_projects_${columnName}_new"
                USING ${columnName}::text::"enum_projects_${columnName}_new";
            `);

            // Drop old enum and rename new one
            await queryInterface.sequelize.query(
                `DROP TYPE IF EXISTS "enum_projects_${columnName}";`
            );
            await queryInterface.sequelize.query(
                `ALTER TYPE "enum_projects_${columnName}_new" RENAME TO "enum_projects_${columnName}";`
            );

            // Update default value
            await queryInterface.sequelize.query(`
                ALTER TABLE projects ALTER COLUMN ${columnName} SET DEFAULT 'not_started';
            `);
        } else if (dialect === 'mysql' || dialect === 'mariadb') {
            // MySQL: Alter column directly
            const tableInfo = await queryInterface.describeTable('projects');
            const columnName = tableInfo.status
                ? 'status'
                : tableInfo.state
                  ? 'state'
                  : null;

            if (!columnName) {
                console.log(
                    '⚠️  Neither state nor status column found in projects table, skipping migration'
                );
                return;
            }

            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'not_started' WHERE ${columnName} = 'idea'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'waiting' WHERE ${columnName} = 'blocked'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'done' WHERE ${columnName} = 'completed'`
            );

            await queryInterface.changeColumn('projects', columnName, {
                type: Sequelize.ENUM(
                    'not_started',
                    'in_progress',
                    'done',
                    'waiting',
                    'cancelled',
                    'planned'
                ),
                allowNull: false,
                defaultValue: 'not_started',
            });
        }
    },

    async down(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        if (dialect === 'sqlite') {
            // Reverse the data mapping
            const tableInfo = await queryInterface.describeTable('projects');
            const columnName = tableInfo.status
                ? 'status'
                : tableInfo.state
                  ? 'state'
                  : null;

            if (!columnName) {
                console.log(
                    '⚠️  Neither state nor status column found in projects table, skipping rollback'
                );
                return;
            }

            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'idea' WHERE ${columnName} = 'not_started'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'blocked' WHERE ${columnName} = 'waiting'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'completed' WHERE ${columnName} = 'done'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET ${columnName} = 'idea' WHERE ${columnName} = 'cancelled'`
            );
        } else if (dialect === 'postgres') {
            await queryInterface.sequelize.query(`
                CREATE TYPE "enum_projects_state_old" AS ENUM(
                    'idea', 'planned', 'in_progress', 'blocked', 'completed'
                );
            `);

            // Reverse data mapping
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'idea' WHERE state = 'not_started'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'blocked' WHERE state = 'waiting'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'completed' WHERE state = 'done'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'idea' WHERE state = 'cancelled'`
            );

            await queryInterface.sequelize.query(`
                ALTER TABLE projects
                ALTER COLUMN state TYPE "enum_projects_state_old"
                USING state::text::"enum_projects_state_old";
            `);

            await queryInterface.sequelize.query(
                `DROP TYPE IF EXISTS "enum_projects_state";`
            );
            await queryInterface.sequelize.query(
                `ALTER TYPE "enum_projects_state_old" RENAME TO "enum_projects_state";`
            );

            await queryInterface.sequelize.query(`
                ALTER TABLE projects ALTER COLUMN state SET DEFAULT 'idea';
            `);
        } else if (dialect === 'mysql' || dialect === 'mariadb') {
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'idea' WHERE state = 'not_started'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'blocked' WHERE state = 'waiting'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'completed' WHERE state = 'done'`
            );
            await queryInterface.sequelize.query(
                `UPDATE projects SET state = 'idea' WHERE state = 'cancelled'`
            );

            await queryInterface.changeColumn('projects', 'state', {
                type: Sequelize.ENUM(
                    'idea',
                    'planned',
                    'in_progress',
                    'blocked',
                    'completed'
                ),
                allowNull: false,
                defaultValue: 'idea',
            });
        }
    },
};
