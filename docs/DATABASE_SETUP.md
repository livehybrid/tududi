# Database Setup Guide

This guide explains how to set up and initialize the database for Tududi, whether using SQLite (default), MySQL, or PostgreSQL.

## Quick Start

### For SQLite (Default)

No configuration needed! Just run:
```bash
npm run db:init
npm run db:migrate
```

### For MySQL

1. **Install dependencies** (already in package.json):
   ```bash
   npm install
   ```

2. **Set environment variables** in `.env`:
   ```env
   DB_DIALECT=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=tududi
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

3. **Create the database**:
   ```sql
   CREATE DATABASE tududi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Initialize and migrate**:
   ```bash
   npm run db:init    # Creates all tables
   npm run db:migrate # Runs pending migrations
   ```

### For PostgreSQL

1. **Install dependencies** (already in package.json):
   ```bash
   npm install
   ```

2. **Set environment variables** in `.env`:
   ```env
   DB_DIALECT=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tududi
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

3. **Create the database**:
   ```sql
   CREATE DATABASE tududi;
   ```

4. **Initialize and migrate**:
   ```bash
   npm run db:init    # Creates all tables
   npm run db:migrate # Runs pending migrations
   ```

## Available Commands

- `npm run db:init` - Creates all tables from models (WARNING: drops existing data!)
- `npm run db:migrate` - Runs Sequelize migrations and syncs models
- `npm run db:status` - Shows database connection status and table statistics
- `npm run db:sync` - Syncs models to database (creates/alters tables)
- `npm run migration:run` - Runs Sequelize CLI migrations only
- `npm run migration:status` - Shows migration status

## How It Works

### Database Configuration

The database type is determined by the `DB_DIALECT` environment variable:
- Not set or `sqlite` → Uses SQLite (file-based)
- `mysql` → Uses MySQL
- `postgres` or `postgresql` → Uses PostgreSQL

Configuration is read from:
- `backend/models/index.js` - Main Sequelize instance
- `backend/config/database.js` - Sequelize CLI configuration

### Migration Process

1. **`db:init`** - Uses `sequelize.sync({ force: true })` to create all tables from models
   - ⚠️ **WARNING**: This drops all existing data!

2. **`db:migrate`** - Two-step process:
   - Runs Sequelize CLI migrations from `backend/migrations/`
   - Syncs models with `sequelize.sync({ alter: true })` to ensure tables match models

3. **Sequelize CLI** - Reads from `backend/config/database.js` and uses the same environment variables

## Troubleshooting

### Connection Errors

If you get connection errors:
1. Verify your database server is running
2. Check environment variables are set correctly
3. Verify database exists: `mysql -u user -p` or `psql -U user -d tududi`
4. Check firewall/network settings

### Migration Errors

If migrations fail:
- Check database logs for specific errors
- Ensure database user has CREATE/ALTER permissions
- For MySQL: Ensure user has privileges on the database
- For PostgreSQL: Ensure user has CREATE privileges on the schema

### Table Already Exists Errors

If you see "table already exists":
- This is normal if tables were created by `db:init`
- Migrations will skip existing tables
- Use `db:migrate` instead of `db:init` for existing databases

## Notes

- All SQLite-specific code is conditionally executed and won't interfere with MySQL/PostgreSQL
- The `db:migrate` script automatically detects the database dialect
- Foreign key constraints are handled differently per database type
- Backup table cleanup works for all database types
