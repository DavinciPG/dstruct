const { Sequelize } = require('sequelize');
const { sequelizeConfig } = require('../config/database');

const sequelize = new Sequelize(
    sequelizeConfig.database,
    sequelizeConfig.username,
    sequelizeConfig.password,
    {
        host: sequelizeConfig.host,
        dialect: sequelizeConfig.dialect,
        pool: sequelizeConfig.pool,
        omitNull: true,
        define: {
            freezeTableName: true
        }
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully to the database.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require('./User')(sequelize);
db.documents = require('./Document')(sequelize);
db.folders = require('./Folder')(sequelize);
db.folderprivileges = require('./FolderPrivileges')(sequelize);
db.documentprivileges = require('./DocumentPrivileges')(sequelize);

// Associations
// Document and User
db.users.hasMany(db.documents, { foreignKey: 'owner_id' });
db.documents.belongsTo(db.users, { foreignKey: 'owner_id' });

// Document and Folder
db.users.hasMany(db.folders, { foreignKey: 'user_id' });
db.folders.belongsTo(db.users, { foreignKey: 'user_id' });

// DocumentPrivileges and Document
db.documents.hasMany(db.documentprivileges, { foreignKey: 'document_id', as: 'Privileges' });
db.documentprivileges.belongsTo(db.documents, { foreignKey: 'document_id', as: 'Document' });

// FolderPrivileges and Folder
db.folders.hasMany(db.folderprivileges, { foreignKey: 'FOLDER_ID', as: 'Privileges' });
db.folderprivileges.belongsTo(db.folders, { foreignKey: 'FOLDER_ID', as: 'Folder' });

// User and User
db.users.belongsTo(db.users, { as: 'Inviter', foreignKey: 'invited_by' });
db.users.hasMany(db.users, { as: 'Invitees', foreignKey: 'invited_by' });

module.exports = db;