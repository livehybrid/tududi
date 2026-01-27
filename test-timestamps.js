const { sequelize } = require('./backend/models');

async function testTimestamps() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Check if tasks table exists and get its structure
        const result = await sequelize.query('PRAGMA table_info(tasks);');
        
        if (result[0].length === 0) {
            console.log('❌ Tasks table does not exist');
            return;
        }

        console.log('Columns in tasks table:');
        result[0].forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });

        const hasCreatedAt = result[0].some(col => col.name === 'created_at');
        const hasUpdatedAt = result[0].some(col => col.name === 'updated_at');
        
        console.log(`\ncreated_at exists: ${hasCreatedAt}`);
        console.log(`updated_at exists: ${hasUpdatedAt}`);

        if (hasCreatedAt && hasUpdatedAt) {
            console.log('\n✅ Timestamp columns exist! Microsoft Todo import should work now.');
        } else {
            console.log('\n❌ Timestamp columns missing. Need to run migration.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

testTimestamps();
