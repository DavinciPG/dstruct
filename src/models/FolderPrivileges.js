const { Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class FolderPrivileges extends Model {}

    FolderPrivileges.init({
        ID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        FOLDER_ID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'folders',
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
        },
        CREATE_PRIVILEGE: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        sequelize,
        tableName: 'folder_privileges',
        timestamps: false
    });

    return FolderPrivileges;
}