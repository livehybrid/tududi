const { DataTypes } = require('sequelize');
const { generateId } = require('../utils/id-generator');

module.exports = (sequelize) => {
    const ResearchJob = sequelize.define(
        'ResearchJob',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            uuid: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
                defaultValue: DataTypes.UUIDV4,
            },
            nanoid: {
                type: DataTypes.STRING(21),
                allowNull: false,
                unique: true,
                defaultValue: () => generateId(),
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            task_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tasks',
                    key: 'id',
                },
            },
            query: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'pending',
            },
            result: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            error: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            send_email: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            email_sent: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: 'research_jobs',
            indexes: [
                {
                    fields: ['user_id'],
                },
                {
                    fields: ['status'],
                },
            ],
        }
    );

    return ResearchJob;
};
