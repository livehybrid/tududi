require('dotenv').config();
const path = require('path');
const { setConfig, getConfig } = require('../config/config');
const config = getConfig();

// Determine database dialect from environment variable, default to SQLite
const dbDialect = process.env.DB_DIALECT || 'sqlite';

const commonConfig = {
    define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
};

let developmentConfig, testConfig, productionConfig;

if (dbDialect === 'mysql') {
    const mysqlConfig = {
        dialect: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_NAME || 'tududi',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        ...commonConfig,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    };
    developmentConfig = { ...mysqlConfig, logging: console.log };
    testConfig = { ...mysqlConfig, logging: false };
    productionConfig = { ...mysqlConfig, logging: false };
} else if (dbDialect === 'postgres' || dbDialect === 'postgresql') {
    const postgresConfig = {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'tududi',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ...commonConfig,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    };
    developmentConfig = { ...postgresConfig, logging: console.log };
    testConfig = { ...postgresConfig, logging: false };
    productionConfig = { ...postgresConfig, logging: false };
} else {
    // Default to SQLite
    const sqliteConfig = {
        dialect: 'sqlite',
        storage: config.dbFile,
        ...commonConfig,
    };
    developmentConfig = { ...sqliteConfig, logging: console.log };
    testConfig = { ...sqliteConfig, logging: false };
    productionConfig = { ...sqliteConfig, logging: false };
}

module.exports = {
    development: developmentConfig,
    test: testConfig,
    production: productionConfig,
};
