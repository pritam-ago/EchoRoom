import { Router } from 'express';
import { RoomController } from '../controllers/roomController.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/public', optionalAuth, RoomController.getPublicRooms);
router.get('/:roomId', optionalAuth, RoomController.getRoom);

// Protected routes
router.post('/', authenticateToken, RoomController.createRoom);
router.get('/user/rooms', authenticateToken, RoomController.getUserRooms);
router.put('/:roomId', authenticateToken, RoomController.updateRoom);
router.delete('/:roomId', authenticateToken, RoomController.deleteRoom);
router.post('/:roomId/join', authenticateToken, RoomController.joinRoom);
router.post('/:roomId/leave', authenticateToken, RoomController.leaveRoom);

export default router; 