const userRouter = require('../routes/users');
const folderRouter = require('../routes/folders');
const documentRouter = require('../routes/documents');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    res.status(401).json({ message: 'Session is not authenticated.' });
}
const configureRouters = (app) => {
    app.use('/api', userRouter);

    app.use('/api/docs', isAuthenticated, folderRouter);
    app.use('/api/docs', isAuthenticated, documentRouter);
};

module.exports = { configureRouters, isAuthenticated };