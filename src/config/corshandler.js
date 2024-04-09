const cors = require('cors');

class CorsHandler {
    constructor() {
        this.whitelistedIps = ['http://localhost', 'http://localhost:8080', 'http://193.40.62.2', 'https://dfront.vocoprojektid.ee', 'http://84.50.240.255:8080'];
        this.corsOptions = {
            origin: (origin, callback) => {
                if (this.whitelistedIps.indexOf(origin) !== -1 || !origin) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        };
    }

    getMiddleware() {
        return cors(this.corsOptions);
    }

    applyTo(app) {
        app.use(this.getMiddleware());
        app.options('*', this.getMiddleware());
    }
}

module.exports = CorsHandler;
