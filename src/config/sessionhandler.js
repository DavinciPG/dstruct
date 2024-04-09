const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const mysql= require('mysql2');

/**
 * SessionHandler Configuration
 */
class SessionHandler {
    constructor(sequelizeConfig) {
        const dbPool = mysql.createPool({
            host: sequelizeConfig.host,
            port: sequelizeConfig.port || 3306,
            user: sequelizeConfig.username,
            password: sequelizeConfig.password,
            database: sequelizeConfig.database,
            waitForConnections: true,
            queueLimit: 0,
            connectionLimit: 0,
        });

        this.sessionStore = new MySQLStore({
            clearExpired: true,
            checkExpirationInterval: 900000,
            expiration: 86400000,
            createDatabaseTable: true,
            schema: {
                tableName: 'sessions',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }
        }, dbPool);
    }

    getSessionMiddleware() {
        return session({
            secret: 'kekk1mme12keiasjxcamqwkeijqdxcjasi',
            store: this.sessionStore,
            resave: false,
            saveUninitialized: true,
            cookie: {
                sameSite: 'None', // set to 'lax' when in production
                secure: true,
                httpOnly: true, // remove when in production
                maxAge: 1000 * 60 * 60 * 24 * 30
            },
        });
    }
}

module.exports = SessionHandler;