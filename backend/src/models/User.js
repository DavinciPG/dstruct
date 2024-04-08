const { Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class User extends Model {}

    User.init({
        ID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        EMAIL: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        teacher: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        created: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        },
        changed: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        },
        administrator: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0,
            comment: "diagnostic availability"
        },
        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: false,
    });

    return User;
};
