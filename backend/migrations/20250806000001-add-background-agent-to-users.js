'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('users');

        if (!('background_agent_enabled' in tableInfo)) {
            await queryInterface.addColumn(
                'users',
                'background_agent_enabled',
                {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                }
            );
        }

        if (!('openrouter_api_key' in tableInfo)) {
            await queryInterface.addColumn('users', 'openrouter_api_key', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'background_agent_enabled');
        await queryInterface.removeColumn('users', 'openrouter_api_key');
    },
};
