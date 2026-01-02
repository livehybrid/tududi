'use strict';

/**
 * Migration to rename project 'state' column to 'status' for consistency.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if column is already named 'status' or if 'state' exists
        const tableInfo = await queryInterface.describeTable('projects');
        
        if (tableInfo.status) {
            // Column is already named 'status', nothing to do
            console.log('⚠️  Column is already named "status", skipping rename');
            return;
        }
        
        if (tableInfo.state) {
            // Column is named 'state', rename it to 'status'
            await queryInterface.renameColumn('projects', 'state', 'status');
        } else {
            console.log('⚠️  Neither "state" nor "status" column found, skipping rename');
        }
    },

    async down(queryInterface, Sequelize) {
        // Check if column is named 'status' and needs to be renamed back to 'state'
        const tableInfo = await queryInterface.describeTable('projects');
        
        if (tableInfo.state) {
            // Column is already named 'state', nothing to do
            console.log('⚠️  Column is already named "state", skipping rollback');
            return;
        }
        
        if (tableInfo.status) {
            // Column is named 'status', rename it back to 'state'
            await queryInterface.renameColumn('projects', 'status', 'state');
        } else {
            console.log('⚠️  Neither "state" nor "status" column found, skipping rollback');
        }
    },
};
