'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('Skipping add-uid-to-users migration - will be handled by sequelize.sync()');
        // This migration is now a no-op - the uid column will be added by sequelize.sync()
        // which is called after migrations in the db-migrate.js script
    },

    async down(queryInterface) {
        console.log('Skipping rollback of add-uid-to-users migration - no-op');
        // This migration is now a no-op
    },
};
