const { DataTypes } = require('sequelize');
const { generateId } = require('../utils/id-generator');

module.exports = (sequelize) => {
    const Tag = sequelize.define(
        'Tag',
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
            tableName: 'tags',
            indexes: [
                {
                    fields: ['user_id'],
                },
                {
                    unique: true,
                    fields: ['user_id', 'name'],
                    name: 'tags_user_id_name_unique',
                },
            ],
        }
    );

    return Tag;
};
