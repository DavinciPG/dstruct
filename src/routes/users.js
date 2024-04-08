const { Router } = require('express');

const userController = require('../controllers/userController');

const router = Router();

router.get('/sessions', userController.getCurrentSession);

router.post('/sessions', userController.authenticateSession);

router.delete('/sessions', userController.destroySession);

router.get('/sessions/students', userController.getAllStudents);

router.post('/sessions/students', userController.addUserByEmail);

router.delete('/sessions/students', userController.removeUserByEmail);

router.post('/sessions/students/:email/reset-password', userController.resetUserPassword);

module.exports = router;