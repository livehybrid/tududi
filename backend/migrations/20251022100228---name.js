'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add your migration logic here
    // Examples:
    
    // Add a new column:
    // await queryInterface.addColumn('table_name', 'column_name', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });
    
    // Create a new table:
    // await queryInterface.createTable('table_name', {
    //   id: {
    //     allowNull: false,
    //     autoIncrement: true,
    //     primaryKey: true,
    //     type: Sequelize.INTEGER
    //   },
    //   created_at: {
    //     allowNull: false,
    //     type: Sequelize.DATE,
    //     defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    //   },
    //   updated_at: {
    //     allowNull: false,
    //     type: Sequelize.DATE,
    //     defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    //   }
    // });
    
    // Add an index:
    // await queryInterface.addIndex('table_name', ['column_name']);
    
    throw new Error('Migration not implemented yet!');
  },

  async down(queryInterface, Sequelize) {
    // Add your rollback logic here
    // Examples:
    
    // Remove a column:
    // await queryInterface.removeColumn('table_name', 'column_name');
    
    // Drop a table:
    // await queryInterface.dropTable('table_name');
    
    // Remove an index:
    // await queryInterface.removeIndex('table_name', ['column_name']);
    
    throw new Error('Rollback not implemented yet!');
  }
};