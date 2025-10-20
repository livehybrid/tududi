const { DataTypes } = require('sequelize');
const { generateId } = require('../utils/id-generator');

module.exports = (sequelize) => {
    const Area = sequelize.define(
        'Area',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            uid: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                defaultValue: () => generateId(),
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'areas',
            indexes: [
                {
                    fields: ['user_id'],
                },
            ],
        }
    );

    return Area;
};
