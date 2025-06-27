import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { validateRequest, authValidation } from '../utils/validation.js';
import { createError } from '../middlewares/errorHandler.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = validateRequest(authValidation.register, req.body);
      const result = await AuthService.register(validatedData);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = validateRequest(authValidation.login, req.body);
      const result = await AuthService.login(validatedData);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        throw createError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
      });
    } catch (error) {
      next(error);
    }
  }
} 