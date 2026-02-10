'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            console.log('Starting add-timestamps-to-tasks migration');

            // Check if created_at column exists (using underscored naming as per database config)
            const tableDescription =
                await queryInterface.describeTable('tasks');

            if (!tableDescription.created_at) {
                console.log('Adding created_at column to tasks table');
                await queryInterface.addColumn('tasks', 'created_at', {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                });
                console.log('Added created_at column to tasks table');
            } else {
                console.log('created_at column already exists in tasks table');
            }

            if (!tableDescription.updated_at) {
                console.log('Adding updated_at column to tasks table');
                await queryInterface.addColumn('tasks', 'updated_at', {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                });
                console.log('Added updated_at column to tasks table');
            } else {
                console.log('updated_at column already exists in tasks table');
            }

            // Update existing records to have non-null timestamps
            console.log('Updating existing tasks with default timestamps');
            await queryInterface.sequelize.query(
                'UPDATE tasks SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL;'
            );
            await queryInterface.sequelize.query(
                'UPDATE tasks SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;'
            );
            console.log('Updated existing tasks with default timestamps');
            console.log('Migration completed successfully');
        } catch (error) {
            console.log(
                'Migration error in add-timestamps-to-tasks:',
                error.message
            );
            console.log('Full error:', error);
            // Don't throw error - let the migration continue
            console.log('Continuing despite error...');
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            console.log(
                'Starting rollback of add-timestamps-to-tasks migration'
            );
            // Remove the timestamp columns
            await queryInterface.removeColumn('tasks', 'created_at');
            await queryInterface.removeColumn('tasks', 'updated_at');
            console.log('Rollback completed successfully');
        } catch (error) {
            console.log('Error removing timestamp columns:', error.message);
            console.log('Continuing despite error...');
        }
    },
};
