'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        console.log(
            'Skipping add-external-id-to-tasks migration - will be handled by sequelize.sync()'
        );
        // This migration is now a no-op - the external_id column will be added by sequelize.sync()
        // which is called after migrations in the db-migrate.js script
    },

    async down(queryInterface, Sequelize) {
        console.log(
            'Skipping rollback of add-external-id-to-tasks migration - no-op'
        );
        // This migration is now a no-op
    },
};
