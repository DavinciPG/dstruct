import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import configureRouters from './config/router_handler';
import cors from 'cors';

import pool from './config/database';
import expressMySqlSession from 'express-mysql-session';

const MySQLStore = expressMySqlSession(session);


// initialize dotenv

dotenv.config();


const app = express();



// initialize cors

const whitelisted_ips = ['http://localhost', 'http://193.40.62.2', 'https://dfront.vocoprojektid.ee'];
const cors_options = {
    origin: whitelisted_ips,
    credentials: true
}

app.use(cors(cors_options));
app.options('*', cors(cors_options));

// parser

app.use(bodyParser.json({limit: '50mb'}));

app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));

const options = {
    expiration: 10800000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}

const sessionStore = new MySQLStore(options, pool);


// session management

app.use(session({

    secret: 'kekk1mme12keiasjxcamqwkeijqdxcjasi',
    store: sessionStore,
    resave: false,

    saveUninitialized: true,

    cookie: {

        sameSite: 'lax',

        secure: false,

    },

}));



// configure our routers

configureRouters(app);



// @todo: RATE LIMITING



// start the server

const PORT = process.env.PORT || 5155;

app.listen(PORT, () => {

    console.log(`Server is running on port ${PORT}`);

});