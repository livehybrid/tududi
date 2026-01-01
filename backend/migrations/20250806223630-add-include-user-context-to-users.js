'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.include_user_context) {
      await queryInterface.addColumn('users', 'include_user_context', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if column exists before removing
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.include_user_context) {
      await queryInterface.removeColumn('users', 'include_user_context');
    }
  }
};