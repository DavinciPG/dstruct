const { Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class Folder extends Model {}

    Folder.init({
        ID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        _ID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'folders',
                key: 'ID',
            }
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID',
            }
        },
        title: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'ÜLDINE'
        }
    }, {
        sequelize,
        tableName: 'folders',
        timestamps: false
    });

    return Folder;
};
