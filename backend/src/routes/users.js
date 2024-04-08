const { Router } = require('express');

const userController = require('../controllers/userController');

const router = Router();

router.get('/sessions', userController.getCurrentSession);

router.post('/sessions', userController.authenticateSession);

router.delete('/sessions', userController.destroySession);

module.exports = router;