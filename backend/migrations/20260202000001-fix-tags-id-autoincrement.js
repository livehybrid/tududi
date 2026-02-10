"use strict";

const loadTagForeignKeys = async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(`
        SELECT
            rc.CONSTRAINT_NAME AS constraintName,
            kcu.TABLE_NAME AS tableName,
            kcu.COLUMN_NAME AS columnName,
            rc.DELETE_RULE AS deleteRule,
            rc.UPDATE_RULE AS updateRule
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
            AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
            AND rc.REFERENCED_TABLE_NAME = 'tags'
            AND kcu.REFERENCED_COLUMN_NAME = 'id';
    `);
    return rows;
};

const dropTagForeignKeys = async (queryInterface, foreignKeys) => {
    for (const fk of foreignKeys) {
        await queryInterface.sequelize.query(
            `ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\`;`
        );
    }
};

const addTagForeignKeys = async (queryInterface, foreignKeys) => {
    for (const fk of foreignKeys) {
        await queryInterface.sequelize.query(
            `ALTER TABLE \`${fk.tableName}\`
             ADD CONSTRAINT \`${fk.constraintName}\`
             FOREIGN KEY (\`${fk.columnName}\`)
             REFERENCES \`tags\`(\`id\`)
             ON DELETE ${fk.deleteRule}
             ON UPDATE ${fk.updateRule};`
        );
    }
};

module.exports = {
    async up(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        if (dialect === "mysql" || dialect === "mariadb") {
            const foreignKeys = await loadTagForeignKeys(queryInterface);
            await dropTagForeignKeys(queryInterface, foreignKeys);
            await queryInterface.sequelize.query(
                "ALTER TABLE `tags` MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT;"
            );
            await addTagForeignKeys(queryInterface, foreignKeys);
            return;
        }

        await queryInterface.changeColumn("tags", "id", {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        });
    },

    async down(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        if (dialect === "mysql" || dialect === "mariadb") {
            const foreignKeys = await loadTagForeignKeys(queryInterface);
            await dropTagForeignKeys(queryInterface, foreignKeys);
            await queryInterface.sequelize.query(
                "ALTER TABLE `tags` MODIFY `id` INTEGER NOT NULL;"
            );
            await addTagForeignKeys(queryInterface, foreignKeys);
            return;
        }

        await queryInterface.changeColumn("tags", "id", {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
        });
    },
};
