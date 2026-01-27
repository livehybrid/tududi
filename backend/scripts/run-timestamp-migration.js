const { sequelize } = require('../models');
const { QueryInterface } = require('sequelize');

async function runTimestampMigration() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const queryInterface = sequelize.getQueryInterface();

        // Check current table structure
        const tableDescription = await queryInterface.describeTable('tasks');
        console.log('Current columns:', Object.keys(tableDescription));

        // Check if columns already exist
        const hasCreatedAt = tableDescription.created_at;
        const hasUpdatedAt = tableDescription.updated_at;

        console.log(`created_at exists: ${!!hasCreatedAt}`);
        console.log(`updated_at exists: ${!!hasUpdatedAt}`);

        if (!hasCreatedAt) {
            console.log('Adding created_at column...');
            await queryInterface.addColumn('tasks', 'created_at', {
                type: sequelize.Sequelize.DATE,
                allowNull: false,
                defaultValue: sequelize.Sequelize.NOW,
            });
            console.log('✅ created_at column added');
        } else {
            console.log('✅ created_at column already exists');
        }

        if (!hasUpdatedAt) {
            console.log('Adding updated_at column...');
            await queryInterface.addColumn('tasks', 'updated_at', {
                type: sequelize.Sequelize.DATE,
                allowNull: false,
                defaultValue: sequelize.Sequelize.NOW,
            });
            console.log('✅ updated_at column added');
        } else {
            console.log('✅ updated_at column already exists');
        }

        // Verify the columns were added
        const finalDescription = await queryInterface.describeTable('tasks');
        console.log('\nFinal columns:', Object.keys(finalDescription));

        console.log('\n✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

runTimestampMigration();
