const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('../config/config');

async function resetMigrations() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.resolve(__dirname, '..', config.dbFile),
        logging: console.log,
    });

    try {
        console.log('Checking SequelizeMeta table...');

        // Get all recorded migrations
        const [migrations] = await sequelize.query(
            'SELECT name FROM SequelizeMeta ORDER BY name;'
        );

        console.log(
            'Current migrations:',
            migrations.map((m) => m.name)
        );

        // Remove the problematic migrations so they can be re-run
        const migrationsToReset = [
            '20250925000001-add-uid-to-users',
            '20251022100231-add-external-id-to-tasks',
            '20251022130000-add-external-source-to-tasks',
            '20251022150000-add-timestamps-to-tasks',
        ];

        for (const migration of migrationsToReset) {
            const result = await sequelize.query(
                'DELETE FROM SequelizeMeta WHERE name = ?;',
                { replacements: [migration + '.js'] }
            );
            console.log(`Removed migration: ${migration}.js`);
        }

        console.log('✅ Migration state reset successfully');
    } catch (error) {
        console.error('❌ Error resetting migrations:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

resetMigrations().catch((error) => {
    console.error(error);
    process.exit(1);
});
