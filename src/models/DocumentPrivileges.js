const { Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class DocumentPrivileges extends Model {}

    DocumentPrivileges.init({
        ID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        document_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'documents',
                key: 'ID'
            }
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID'
            }
        },
        READ_PRIVILEGE: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        WRITE_PRIVILEGE: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        DELETE_PRIVILEGE: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        sequelize,
        tableName: 'document_privileges',
        timestamps: false
    });

    return DocumentPrivileges;
}