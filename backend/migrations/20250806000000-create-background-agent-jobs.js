'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('background_agent_jobs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            uuid: {
                type: Sequelize.UUID,
                allowNull: false,
                defaultValue:
                    queryInterface.sequelize.getDialect() === 'sqlite'
                        ? Sequelize.literal('(lower(hex(randomblob(16))))')
                        : Sequelize.literal('(UUID())'),
            },
            nanoid: {
                type: Sequelize.STRING(21),
                allowNull: false,
                unique: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            task_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'tasks', key: 'id' },
                onDelete: 'SET NULL',
            },
            query: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'pending',
            },
            result: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            error: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            send_email: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            email_sent: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        await queryInterface.addIndex('background_agent_jobs', {
            fields: ['user_id'],
            name: 'background_agent_jobs_user_id_index',
        });
        await queryInterface.addIndex('background_agent_jobs', {
            fields: ['status'],
            name: 'background_agent_jobs_status_index',
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('background_agent_jobs');
    },
};
