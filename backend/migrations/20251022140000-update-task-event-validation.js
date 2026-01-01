'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // This migration is for model validation changes only
        // No database schema changes needed as we're just updating validation rules
        console.log('Updated TaskEvent model validation rules to include Microsoft Todo fields');
    },

    async down(queryInterface, Sequelize) {
        // No rollback needed for validation changes
        console.log('TaskEvent validation rules reverted');
    },
};
