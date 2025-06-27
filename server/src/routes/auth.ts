import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getProfile);
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router; 