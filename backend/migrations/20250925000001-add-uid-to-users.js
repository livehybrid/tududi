'use strict';

const { safeAddColumns, safeAddIndex } = require('../utils/migration-utils');
const { uid } = require('../utils/uid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if uid column already exists
        const tableInfo = await queryInterface.describeTable('users');

        if (!tableInfo.uid) {
            // Add uid column
            await safeAddColumns(queryInterface, 'users', [
                {
                    name: 'uid',
                    definition: {
                        type: Sequelize.STRING,
                        allowNull: true, // Initially allow null during population
                    },
                },
            ]);

            // Populate uid values for existing users
            const users = await queryInterface.sequelize.query(
                'SELECT id FROM users WHERE uid IS NULL',
                { type: Sequelize.QueryTypes.SELECT }
            );

            // Generate uid for each user
            for (const user of users) {
                const uniqueId = uid();
                await queryInterface.sequelize.query(
                    'UPDATE users SET uid = ? WHERE id = ?',
                    {
                        replacements: [uniqueId, user.id],
                        type: Sequelize.QueryTypes.UPDATE,
                    }
                );
            }

            // Make uid column not null and unique
            await queryInterface.changeColumn('users', 'uid', {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            });

            // Add unique index for performance
            await safeAddIndex(queryInterface, 'users', ['uid'], {
                unique: true,
                name: 'users_uid_unique_index',
            });
        }
    },

    async down(queryInterface) {
        try {
            await queryInterface.removeIndex('users', 'users_uid_unique_index');
        } catch (error) {
            // Index might not exist
        }
        try {
            await queryInterface.removeColumn('users', 'uid');
        } catch (error) {
            // Column might not exist
        }
    },
};
