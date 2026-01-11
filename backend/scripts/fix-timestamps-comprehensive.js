const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

async function fixTimestamps() {
    try {
        console.log('Starting timestamp fix...');

        // Ensure database directory exists
        const dbDir = path.join(__dirname, '..', 'db');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('Created database directory');
        }

        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Check if tasks table exists
        const tables = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks';"
        );

        if (tables[0].length === 0) {
            console.log(
                '❌ Tasks table does not exist. Need to run full migration first.'
            );
            return;
        }

        // Get current table structure
        const result = await sequelize.query('PRAGMA table_info(tasks);');
        console.log(
            'Current columns:',
            result[0].map((col) => col.name)
        );

        const hasCreatedAt = result[0].some((col) => col.name === 'created_at');
        const hasUpdatedAt = result[0].some((col) => col.name === 'updated_at');

        console.log(`created_at exists: ${hasCreatedAt}`);
        console.log(`updated_at exists: ${hasUpdatedAt}`);

        if (!hasCreatedAt) {
            console.log('Adding created_at column...');
            await sequelize.query(
                'ALTER TABLE tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
            console.log('✅ created_at column added');
        }

        if (!hasUpdatedAt) {
            console.log('Adding updated_at column...');
            await sequelize.query(
                'ALTER TABLE tasks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
            console.log('✅ updated_at column added');
        }

        // Update existing records
        console.log('Updating existing records...');
        await sequelize.query(
            'UPDATE tasks SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL;'
        );
        await sequelize.query(
            'UPDATE tasks SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;'
        );
        console.log('✅ Updated existing records');

        // Verify final structure
        const finalResult = await sequelize.query('PRAGMA table_info(tasks);');
        const finalHasCreatedAt = finalResult[0].some(
            (col) => col.name === 'created_at'
        );
        const finalHasUpdatedAt = finalResult[0].some(
            (col) => col.name === 'updated_at'
        );

        console.log(`\nFinal verification:`);
        console.log(`created_at exists: ${finalHasCreatedAt}`);
        console.log(`updated_at exists: ${finalHasUpdatedAt}`);

        if (finalHasCreatedAt && finalHasUpdatedAt) {
            console.log('\n✅ SUCCESS: Timestamp columns are now available!');
            console.log('Microsoft Todo import should work now.');
        } else {
            console.log('\n❌ FAILED: Timestamp columns still missing');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('duplicate column name')) {
            console.log('Note: Columns may already exist, which is fine.');
        }
    } finally {
        await sequelize.close();
    }
}

fixTimestamps();
