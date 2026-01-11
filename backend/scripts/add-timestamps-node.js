const { sequelize } = require('../models');

async function addTimestamps() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Add created_at column
        try {
            await sequelize.query(
                'ALTER TABLE tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
            console.log('✅ Added created_at column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('✅ created_at column already exists');
            } else {
                throw error;
            }
        }

        // Add updated_at column
        try {
            await sequelize.query(
                'ALTER TABLE tasks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
            console.log('✅ Added updated_at column');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('✅ updated_at column already exists');
            } else {
                throw error;
            }
        }

        // Update existing records
        await sequelize.query(
            'UPDATE tasks SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL;'
        );
        await sequelize.query(
            'UPDATE tasks SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;'
        );
        console.log('✅ Updated existing records with timestamps');

        // Verify columns exist
        const result = await sequelize.query('PRAGMA table_info(tasks);');
        console.log('\nColumns in tasks table:');
        result[0].forEach((col) => {
            console.log(`- ${col.name} (${col.type})`);
        });

        const hasCreatedAt = result[0].some((col) => col.name === 'created_at');
        const hasUpdatedAt = result[0].some((col) => col.name === 'updated_at');

        console.log(`\ncreated_at exists: ${hasCreatedAt}`);
        console.log(`updated_at exists: ${hasUpdatedAt}`);

        if (hasCreatedAt && hasUpdatedAt) {
            console.log('\n✅ Timestamp columns successfully added!');
        } else {
            console.log('\n❌ Failed to add timestamp columns');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

addTimestamps();
