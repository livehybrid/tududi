'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add external_id column to tasks table for Microsoft Todo sync
    await queryInterface.addColumn('tasks', 'external_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'External ID for Microsoft Todo sync'
    });
    
    // Add index for better performance when querying by external_id
    await queryInterface.addIndex('tasks', ['external_id']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the external_id column and its index
    await queryInterface.removeIndex('tasks', ['external_id']);
    await queryInterface.removeColumn('tasks', 'external_id');
  }
};