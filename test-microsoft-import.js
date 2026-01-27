const { sequelize } = require('./backend/models');

async function testMicrosoftImport() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Test the exact query that was failing
        const result = await sequelize.query(`
            SELECT id, uid, name, description, note, due_date, priority, status, 
                   completed_at, external_id, external_source, external_last_modified,
                   created_at, updated_at 
            FROM tasks 
            WHERE user_id = 1 AND external_id = 'test-id' 
            LIMIT 1;
        `);

        console.log('✅ Query executed successfully!');
        console.log('Timestamp columns are working properly.');
        console.log('Microsoft Todo import should now work without errors.');

    } catch (error) {
        if (error.message.includes('no such column: created_at') || error.message.includes('no such column: updated_at')) {
            console.log('❌ Timestamp columns still missing. Need to run the migration.');
        } else {
            console.error('❌ Other error:', error.message);
        }
    } finally {
        await sequelize.close();
    }
}

testMicrosoftImport();
