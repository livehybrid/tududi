'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const tableInfo = await queryInterface.describeTable('users');

            // Add Microsoft Todo integration settings
            if (!('microsoft_todo_access_token' in tableInfo)) {
                await queryInterface.addColumn(
                    'users',
                    'microsoft_todo_access_token',
                    {
                        type: Sequelize.TEXT,
                        allowNull: true,
                    }
                );
            }

            if (!('microsoft_todo_refresh_token' in tableInfo)) {
                await queryInterface.addColumn(
                    'users',
                    'microsoft_todo_refresh_token',
                    {
                        type: Sequelize.TEXT,
                        allowNull: true,
                    }
                );
            }

            if (!('microsoft_todo_expires_at' in tableInfo)) {
                await queryInterface.addColumn(
                    'users',
                    'microsoft_todo_expires_at',
                    {
                        type: Sequelize.DATE,
                        allowNull: true,
                    }
                );
            }

            if (!('microsoft_todo_connected' in tableInfo)) {
                await queryInterface.addColumn(
                    'users',
                    'microsoft_todo_connected',
                    {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: false,
                    }
                );
            }
        } catch (error) {
            console.log('Migration error:', error.message);
            console.log('Continuing despite error...');
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn(
            'users',
            'microsoft_todo_access_token'
        );
        await queryInterface.removeColumn(
            'users',
            'microsoft_todo_refresh_token'
        );
        await queryInterface.removeColumn('users', 'microsoft_todo_expires_at');
        await queryInterface.removeColumn('users', 'microsoft_todo_connected');
    },
};
