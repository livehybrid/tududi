const { sequelize } = require('../models');
const path = require('path');

async function runMigration() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Import the migration
        const migration = require('../migrations/20251022150000-add-timestamps-to-tasks.js');
        
        console.log('Running migration: add-timestamps-to-tasks');
        
        // Get query interface
        const queryInterface = sequelize.getQueryInterface();
        
        // Run the migration
        await migration.up(queryInterface, sequelize.Sequelize);
        
        console.log('✅ Migration completed successfully');
        
        // Verify the columns were added
        const tableDescription = await queryInterface.describeTable('tasks');
        console.log('\nColumns in tasks table:');
        Object.keys(tableDescription).forEach(col => {
            console.log(`- ${col}`);
        });
        
        const hasCreatedAt = tableDescription.created_at;
        const hasUpdatedAt = tableDescription.updated_at;
        
        console.log(`\ncreated_at exists: ${!!hasCreatedAt}`);
        console.log(`updated_at exists: ${!!hasUpdatedAt}`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

runMigration();
