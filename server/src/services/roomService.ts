import { Room, IRoom, IUserCursor } from '../models/Room.js';
import { Session } from '../models/Session.js';
import { createError } from '../middlewares/errorHandler.js';
import { generateRoomId } from '../utils/tokenGenerator.js';
import mongoose from 'mongoose';

export interface CreateRoomData {
  name: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
  ownerId: string;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
}

export interface RoomWithParticipants extends IRoom {
  participants: any[];
}

export class RoomService {
  static async createRoom(data: CreateRoomData): Promise<IRoom> {
    const room = new Room({
      ...data,
      owner: new mongoose.Types.ObjectId(data.ownerId),
      participants: [new mongoose.Types.ObjectId(data.ownerId)],
    });

    await room.save();
    return room;
  }

  static async getRoomById(roomId: string): Promise<IRoom | null> {
    return Room.findById(roomId)
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar');
  }

  static async getPublicRooms(): Promise<IRoom[]> {
    return Room.find({ isPublic: true, isActive: true })
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar')
      .sort({ createdAt: -1 });
  }

  static async getUserRooms(userId: string): Promise<IRoom[]> {
    return Room.find({
      $or: [
        { owner: userId },
        { participants: userId }
      ],
      isActive: true
    })
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar')
      .sort({ updatedAt: -1 });
  }

  static async updateRoom(roomId: string, userId: string, data: UpdateRoomData): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== userId) {
      throw createError('Only room owner can update room', 403);
    }

    Object.assign(room, data);
    await room.save();
    
    return room;
  }

  static async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== userId) {
      throw createError('Only room owner can delete room', 403);
    }

    room.isActive = false;
    await room.save();
  }

  static async joinRoom(roomId: string, userId: string): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!room.participants.includes(userIdObjectId)) {
      room.participants.push(userIdObjectId);
      await room.save();
    }

    // Create or update session
    await Session.findOneAndUpdate(
      { userId, roomId, isActive: true },
      { joinedAt: new Date() },
      { upsert: true, new: true }
    );

    return room;
  }

  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    // Remove from participants if not owner
    if (room.owner.toString() !== userId) {
      room.participants = room.participants.filter(
        (participant) => participant.toString() !== userId
      );
      await room.save();
    }

    // Update session
    await Session.findOneAndUpdate(
      { userId, roomId, isActive: true },
      { leftAt: new Date(), isActive: false }
    );
  }

  static async updateCode(roomId: string, code: string): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    room.code = code;
    await room.save();
    
    return room;
  }

  static async updateCursor(roomId: string, cursor: IUserCursor): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    const existingCursorIndex = room.cursors.findIndex(
      (c) => c.userId === cursor.userId
    );

    if (existingCursorIndex >= 0) {
      room.cursors[existingCursorIndex] = cursor;
    } else {
      room.cursors.push(cursor);
    }

    await room.save();
    return room;
  }

  static async removeCursor(roomId: string, userId: string): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    room.cursors = room.cursors.filter((c) => c.userId !== userId);
    await room.save();
    
    return room;
  }
} 