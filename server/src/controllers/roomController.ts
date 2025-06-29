import { Request, Response, NextFunction } from 'express';
import { RoomService, RoomType } from '../services/roomService.js';
import { validateRequest, roomValidation } from '../utils/validation.js';
import { createError } from '../middlewares/errorHandler.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class RoomController {
  static async createRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const validatedData = validateRequest(roomValidation.create, req.body);
      
      // Convert room type from string to enum
      let roomType: RoomType;
      switch (validatedData.roomType) {
        case 'public':
          roomType = RoomType.PUBLIC;
          break;
        case 'private':
          roomType = RoomType.PRIVATE;
          break;
        case 'request_to_join':
          roomType = RoomType.REQUEST_TO_JOIN;
          break;
        default:
          throw createError('Invalid room type', 400);
      }

      const room = await RoomService.createRoom({
        name: validatedData.name,
        description: validatedData.description,
        language: validatedData.language,
        roomType,
        ownerId: userId,
      });

      res.status(201).json({
        success: true,
        data: {
          ...room.toObject(),
          id: (room as any)._id.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const room = await RoomService.getRoomById(roomId);

      if (!room) {
        throw createError('Room not found', 404);
      }

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rooms = await RoomService.getPublicRooms();

      res.status(200).json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserRooms(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const rooms = await RoomService.getUserRooms(userId);

      res.status(200).json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const validatedData = validateRequest(roomValidation.update, req.body);
      
      // Convert room type if provided
      if (validatedData.roomType) {
        switch (validatedData.roomType) {
          case 'public':
            validatedData.roomType = RoomType.PUBLIC;
            break;
          case 'private':
            validatedData.roomType = RoomType.PRIVATE;
            break;
          case 'request_to_join':
            validatedData.roomType = RoomType.REQUEST_TO_JOIN;
            break;
          default:
            throw createError('Invalid room type', 400);
        }
      }

      const room = await RoomService.updateRoom(roomId, userId, validatedData);

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      await RoomService.deleteRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Room deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const result = await RoomService.joinRoom(roomId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.room,
          message: result.message,
        });
      } else {
        res.status(403).json({
          success: false,
          message: result.message,
          requiresApproval: result.requiresApproval,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async leaveRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      await RoomService.leaveRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Left room successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateJoinCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const { joinCode } = await RoomService.generateJoinCode(roomId, userId);

      res.status(200).json({
        success: true,
        data: { joinCode },
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinRoomWithCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { joinCode } = req.body;
      if (!joinCode) {
        throw createError('Join code is required', 400);
      }

      const result = await RoomService.joinRoomWithCode(joinCode, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.room,
          message: result.message,
        });
      } else {
        res.status(403).json({
          success: false,
          message: result.message,
          requiresApproval: result.requiresApproval,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async getRoomByJoinCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { joinCode } = req.params;
      const room = await RoomService.getRoomByJoinCode(joinCode);

      if (!room) {
        throw createError('Room not found', 404);
      }

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestToJoinRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const username = req.user?.username || 'Unknown User';
      
      const result = await RoomService.requestToJoinRoom({
        roomId,
        userId,
        username
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId, requestUserId } = req.params;
      const room = await RoomService.approveJoinRequest(roomId, userId, requestUserId);

      res.status(200).json({
        success: true,
        data: room,
        message: 'Join request approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId, requestUserId } = req.params;
      const result = await RoomService.rejectJoinRequest(roomId, userId, requestUserId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPendingRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const requests = await RoomService.getPendingRequests(roomId, userId);

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
} 