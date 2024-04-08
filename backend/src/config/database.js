const dotenv = require('dotenv');
dotenv.config();

const sequelizeConfig = {
    database: process.env.DATABASE,
    username: process.env.DATABASE_USER,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    dialect: 'mysql',
    logging: true
};

module.exports = { sequelizeConfig }