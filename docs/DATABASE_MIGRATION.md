# Database Migration Guide: SQLite to MySQL/PostgreSQL

This guide explains how to migrate from SQLite to MySQL or PostgreSQL.

## Overview

The Tududi application uses Sequelize ORM, which supports multiple database backends. The codebase currently uses SQLite but can be configured to use MySQL or PostgreSQL with minimal changes.

## Prerequisites

### For MySQL:
```bash
npm install mysql2 --save
```

### For PostgreSQL:
```bash
npm install pg pg-hstore --save
```

## Configuration Changes

### 1. Environment Variables

Add these environment variables to your `.env` file:

**For MySQL:**
```env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tududi
DB_USER=your_username
DB_PASSWORD=your_password
```

**For PostgreSQL:**
```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tududi
DB_USER=your_username
DB_PASSWORD=your_password
```

### 2. Update Database Configuration

The database configuration is in `backend/models/index.js` and `backend/config/database.js`. These files will automatically detect the database type from environment variables.

## Migration Steps

1. **Install the database driver** (see Prerequisites above)
   ```bash
   npm install
   ```

2. **Set environment variables** for your chosen database in your `.env` file (see Configuration Changes above)

3. **Create the database** (if it doesn't exist):
   - **MySQL**: 
     ```sql
     CREATE DATABASE tududi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   - **PostgreSQL**: 
     ```sql
     CREATE DATABASE tududi;
     ```

4. **Initialize the database** (creates tables from models):
   ```bash
   npm run db:init
   ```
   This will create all tables based on your Sequelize models.

5. **Run migrations** (applies any pending migration files):
   ```bash
   npm run db:migrate
   ```
   This will:
   - Run Sequelize CLI migrations from the `backend/migrations/` directory
   - Sync models to ensure tables match current definitions

   **Note**: The `db:migrate` script now works with MySQL, PostgreSQL, and SQLite. It automatically detects the database dialect and uses the appropriate queries.

6. **Verify the setup**:
   ```bash
   npm run db:status
   ```
   This will show database connection status and table statistics.

7. **Migrate existing data** (if migrating from SQLite):
   - Export data from SQLite
   - Import into new database
   - Or use a migration script

## SQLite-Specific Code

The following files contain SQLite-specific code that will be automatically handled:

- `backend/utils/migration-utils.js` - Already checks dialect before using SQLite-specific features
- `backend/scripts/db-migrate.js` - Already checks dialect for PRAGMA commands
- Various migration files - Most migrations are already database-agnostic

All SQLite-specific code (`PRAGMA` commands) is conditionally executed only when `sequelize.getDialect() === 'sqlite'`, so it won't interfere with MySQL/PostgreSQL.

## Benefits of MySQL/PostgreSQL

- **Better concurrency**: Multiple users can write simultaneously without locking issues
- **Better performance**: For larger datasets and complex queries
- **Better data integrity**: More robust foreign key constraints
- **Production-ready**: Better suited for production deployments
- **Replication**: Support for master-slave replication and clustering

## Testing

After switching databases, run the test suite:

```bash
npm run test
```

Make sure to set appropriate environment variables for the test environment.
