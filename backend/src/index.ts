import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';

import configureRouters from './config/router_handler';

import cors from 'cors';

// initialize dotenv
dotenv.config();

const app = express();

// initialize cors
const whitelisted_ips = ['http://localhost:8080', 'http://localhost:8080/'];
const cors_options = {
    origin: whitelisted_ips,
    credentials: true
}

app.use(cors(cors_options));
app.options('*', cors());

// parser
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));

// session management
app.use(session({
    secret: 'kekk1mme12keiasjxcamqwkeijqdxcjasi',
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