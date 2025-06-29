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
router.patch('/:roomId', authenticateToken, RoomController.updateRoom);
router.delete('/:roomId', authenticateToken, RoomController.deleteRoom);
router.post('/:roomId/join', authenticateToken, RoomController.joinRoom);
router.post('/:roomId/leave', authenticateToken, RoomController.leaveRoom);
router.post('/:roomId/join-code', authenticateToken, RoomController.generateJoinCode);
router.post('/join-with-code', authenticateToken, RoomController.joinRoomWithCode);
router.get('/join-code/:joinCode', optionalAuth, RoomController.getRoomByJoinCode);
router.post('/:roomId/request-to-join', authenticateToken, RoomController.requestToJoinRoom);
router.post('/:roomId/approve/:requestUserId', authenticateToken, RoomController.approveJoinRequest);
router.post('/:roomId/reject/:requestUserId', authenticateToken, RoomController.rejectJoinRequest);
router.post('/:roomId/cancel-request', authenticateToken, RoomController.cancelJoinRequest);
router.get('/:roomId/pending-requests', authenticateToken, RoomController.getPendingRequests);
router.get('/:roomId/has-pending-request', authenticateToken, RoomController.hasPendingRequest);

export default router; 