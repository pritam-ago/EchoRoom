import { Room, IRoom, IUserCursor } from '../models/Room.js';
import { Session } from '../models/Session.js';
import { createError } from '../middlewares/errorHandler.js';
import { generateRoomId, generateJoinCode } from '../utils/tokenGenerator.js';
import mongoose from 'mongoose';

export interface CreateRoomData {
  name: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
  requiresApproval?: boolean;
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

    // Block direct join if approval is required and user is not owner
    if (room.requiresApproval && room.owner.toString() !== userId) {
      throw createError('Room requires approval to join', 403);
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

  static async generateJoinCode(roomId: string, userId: string): Promise<{ joinCode: string }> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== userId) {
      throw createError('Only room owner can generate join codes', 403);
    }

    // Generate a unique join code
    let joinCode: string;
    let isUnique = false;
    
    while (!isUnique) {
      joinCode = generateJoinCode();
      const existingRoom = await Room.findOne({ joinCode, isActive: true });
      if (!existingRoom) {
        isUnique = true;
      }
    }

    room.joinCode = joinCode!;
    await room.save();
    
    return { joinCode: joinCode! };
  }

  static async joinRoomWithCode(joinCode: string, userId: string): Promise<IRoom> {
    const room = await Room.findOne({ joinCode, isActive: true })
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar');
    
    if (!room) {
      throw createError('Invalid join code or room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    // Block direct join if approval is required and user is not owner
    if (room.requiresApproval && room.owner.toString() !== userId) {
      throw createError('Room requires approval to join', 403);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!room.participants.includes(userIdObjectId)) {
      room.participants.push(userIdObjectId);
      await room.save();
    }

    // Create or update session
    await Session.findOneAndUpdate(
      { userId, roomId: (room._id as any).toString(), isActive: true },
      { joinedAt: new Date() },
      { upsert: true, new: true }
    );

    return room;
  }

  static async getRoomByJoinCode(joinCode: string): Promise<IRoom | null> {
    return Room.findOne({ joinCode, isActive: true })
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar');
  }

  static async requestJoinRoom(roomId: string, userId: string, username: string): Promise<{ message: string }> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    // Check if user is already a participant
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (room.participants.includes(userIdObjectId)) {
      throw createError('You are already a participant in this room', 400);
    }

    // Check if user already has a pending request
    const existingRequest = room.pendingRequests.find(
      request => request.userId.toString() === userId
    );
    if (existingRequest) {
      throw createError('You already have a pending request for this room', 400);
    }

    // Add to pending requests
    room.pendingRequests.push({
      userId: userIdObjectId,
      username,
      requestedAt: new Date()
    });

    await room.save();
    
    return { message: 'Join request sent successfully' };
  }

  static async approveJoinRequest(roomId: string, ownerId: string, requestUserId: string): Promise<IRoom> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== ownerId) {
      throw createError('Only room owner can approve requests', 403);
    }

    const requestUserIdObjectId = new mongoose.Types.ObjectId(requestUserId);
    
    // Find and remove the request
    const requestIndex = room.pendingRequests.findIndex(
      request => request.userId.toString() === requestUserId
    );
    
    if (requestIndex === -1) {
      throw createError('Join request not found', 404);
    }

    // Remove from pending requests
    room.pendingRequests.splice(requestIndex, 1);
    
    // Add to participants
    if (!room.participants.includes(requestUserIdObjectId)) {
      room.participants.push(requestUserIdObjectId);
    }

    await room.save();
    
    return room;
  }

  static async rejectJoinRequest(roomId: string, ownerId: string, requestUserId: string): Promise<{ message: string }> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== ownerId) {
      throw createError('Only room owner can reject requests', 403);
    }

    // Find and remove the request
    const requestIndex = room.pendingRequests.findIndex(
      request => request.userId.toString() === requestUserId
    );
    
    if (requestIndex === -1) {
      throw createError('Join request not found', 404);
    }

    // Remove from pending requests
    room.pendingRequests.splice(requestIndex, 1);
    await room.save();
    
    return { message: 'Join request rejected' };
  }

  static async getPendingRequests(roomId: string, userId: string): Promise<any[]> {
    const room = await Room.findById(roomId)
      .populate('pendingRequests.userId', 'username email avatar');
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (room.owner.toString() !== userId) {
      throw createError('Only room owner can view pending requests', 403);
    }

    return room.pendingRequests;
  }
} 