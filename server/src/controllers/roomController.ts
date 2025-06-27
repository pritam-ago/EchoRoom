import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/roomService.js';
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
      const room = await RoomService.createRoom({
        name: validatedData.name,
        description: validatedData.description,
        language: validatedData.language,
        isPublic: !validatedData.isPrivate,
        requiresApproval: validatedData.requiresApproval,
        ownerId: userId,
      });

      res.status(201).json({
        success: true,
        data: room,
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
      const room = await RoomService.joinRoom(roomId, userId);

      res.status(200).json({
        success: true,
        data: room,
      });
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

      const room = await RoomService.joinRoomWithCode(joinCode, userId);

      res.status(200).json({
        success: true,
        data: room,
      });
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

  static async requestJoinRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const username = req.user?.username;
      if (!userId || !username) {
        throw createError('User not authenticated', 401);
      }

      const { roomId } = req.params;
      const result = await RoomService.requestJoinRoom(roomId, userId, username);

      res.status(200).json({
        success: true,
        data: result,
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
        data: result,
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