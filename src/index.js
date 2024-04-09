const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require('express');
const { configureRouters } = require('./config/routehandler');

// initialize dotenv
dotenv.config();
const app = express();

// initialize cors
const CorsHandler = require('./config/corshandler');
const corsHandler = new CorsHandler();
corsHandler.applyTo(app);

app.set('trust proxy', 1);

// parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));

// session handling
const SessionHandler = require('./config/sessionhandler');
const { sequelizeConfig } = require("./config/database");
const sessionHandler = new SessionHandler(sequelizeConfig);

app.use(sessionHandler.getSessionMiddleware());

// configure our routers
configureRouters(app);

// @todo: RATE LIMITING

// start the server
const PORT = process.env.PORT || 5155;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
