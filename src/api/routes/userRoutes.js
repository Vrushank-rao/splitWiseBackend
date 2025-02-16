// src/api/routes/userRoutes.js
import express from 'express';
import userController from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import validationMiddleware from '../middleware/validation.js';

const router = express.Router();

// Public routes with validation
router.post('/register', validationMiddleware.validateRegistration, userController.register.bind(userController));
router.post('/login', validationMiddleware.validateLogin, userController.login.bind(userController));

// Protected routes (require authentication)
router.get('/profile', auth, userController.getProfile.bind(userController));
router.get('/balances', auth, userController.getBalances.bind(userController));

export default router;