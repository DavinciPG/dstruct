const { Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class Document extends Model {}

    Document.init({
        ID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        document_type: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        metadata: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        FOLDER_ID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'folders',
                key: 'ID'
            }
        },
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID'
            }
        },
        file_path: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Relative path to the file'
        }
    }, {
        sequelize,
        tableName: 'documents',
        timestamps: false,
        indexes: [
            {
                name: 'FOLDER_ID',
                using: 'BTREE',
                fields: ['FOLDER_ID']
            },
            {
                name: 'owner_id',
                using: 'BTREE',
                fields: ['owner_id']
            },
        ]
    });

    return Document;
};
