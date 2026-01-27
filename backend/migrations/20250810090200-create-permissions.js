'use strict';

const { safeAddIndex } = require('../utils/migration-utils');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('permissions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            resource_type: { type: Sequelize.STRING, allowNull: false },
            resource_uid: { type: Sequelize.STRING, allowNull: false },
            access_level: { type: Sequelize.STRING, allowNull: false },
            propagation: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'direct',
            },
            granted_by_user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            source_action_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'actions', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
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

        // Add unique constraint (check if it exists first)
        try {
            await queryInterface.addConstraint('permissions', {
                fields: ['user_id', 'resource_type', 'resource_uid'],
                type: 'unique',
                name: 'uniq_permissions_user_resource',
            });
        } catch (error) {
            // Constraint might already exist, continue
            if (
                !error.message.includes('Duplicate') &&
                !error.message.includes('already exists')
            ) {
                throw error;
            }
        }

        // Use safeAddIndex to avoid duplicate index errors
        await safeAddIndex(
            queryInterface,
            'permissions',
            ['resource_type', 'resource_uid'],
            {
                name: 'permissions_resource_type_resource_uid',
            }
        );
        await safeAddIndex(queryInterface, 'permissions', ['user_id'], {
            name: 'permissions_user_id',
        });
        await safeAddIndex(queryInterface, 'permissions', ['access_level'], {
            name: 'permissions_access_level',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('permissions');
    },
};
