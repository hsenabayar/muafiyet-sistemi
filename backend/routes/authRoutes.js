const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// http://localhost:5000/api/auth/register
router.post('/register', authController.register);

// http://localhost:5000/api/auth/login
router.post('/login', authController.login);

// const authMiddleware = require('../middleware/authMiddleware');
router.get('/me', verifyToken, authController.getMe);
module.exports = router;