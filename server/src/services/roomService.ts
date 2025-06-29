import { Room, IRoom, IUserCursor, RoomType } from '../models/Room.js';
import { Session } from '../models/Session.js';
import { createError } from '../middlewares/errorHandler.js';
import { generateRoomId, generateJoinCode } from '../utils/tokenGenerator.js';
import mongoose from 'mongoose';
import { socketManager } from '../server.js';

export interface CreateRoomData {
  name: string;
  description?: string;
  language?: string;
  roomType: RoomType;
  ownerId: string;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  language?: string;
  roomType?: RoomType;
}

export interface RoomWithParticipants extends IRoom {
  participants: any[];
}

export interface JoinRequestData {
  roomId: string;
  userId: string;
  username: string;
}

export interface JoinResponse {
  success: boolean;
  room?: IRoom;
  message: string;
  requiresApproval?: boolean;
}

export class RoomService {
  static async getRoomByJoinCode(joinCode: string): Promise<IRoom | null> {
    return Room.findOne({ joinCode, isActive: true })
      .populate('owner', 'username email avatar')
      .populate('participants', 'username email avatar');
  }

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
    return Room.find({ roomType: RoomType.PUBLIC, isActive: true })
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

  static async joinRoom(roomId: string, userId: string): Promise<JoinResponse> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    const isAlreadyParticipant = room.participants.some(
      participant => participant.toString() === userId
    );

    // If already a participant, allow join
    if (isAlreadyParticipant) {
      await this.createOrUpdateSession(userId, roomId);
      return {
        success: true,
        room,
        message: 'Successfully joined room'
      };
    }

    // Check room type and handle accordingly
    switch (room.roomType) {
      case RoomType.PUBLIC:
        // Public rooms - anyone can join
        room.participants.push(new mongoose.Types.ObjectId(userId));
        await room.save();
        await this.createOrUpdateSession(userId, roomId);
        return {
          success: true,
          room,
          message: 'Successfully joined public room'
        };

      case RoomType.PRIVATE:
        // Private rooms - only with join code or if owner
        if (room.owner.toString() === userId) {
          room.participants.push(new mongoose.Types.ObjectId(userId));
          await room.save();
          await this.createOrUpdateSession(userId, roomId);
          return {
            success: true,
            room,
            message: 'Successfully joined private room as owner'
          };
        }
        throw createError('This is a private room. You need a join code to enter.', 403);

      case RoomType.REQUEST_TO_JOIN:
        // Request to join rooms - need approval
        if (room.owner.toString() === userId) {
          room.participants.push(new mongoose.Types.ObjectId(userId));
          await room.save();
          await this.createOrUpdateSession(userId, roomId);
          return {
            success: true,
            room,
            message: 'Successfully joined room as owner'
          };
        }
        return {
          success: false,
          message: 'Room requires approval to join',
          requiresApproval: true
        };

      default:
        throw createError('Invalid room type', 400);
    }
  }

  static async joinRoomWithCode(joinCode: string, userId: string): Promise<JoinResponse> {
    const room = await Room.findOne({ joinCode, isActive: true });
    
    if (!room) {
      throw createError('Invalid join code or room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    const roomId = (room._id as any).toString();
    const isAlreadyParticipant = room.participants.some(
      participant => participant.toString() === userId
    );

    // If already a participant, allow join
    if (isAlreadyParticipant) {
      await this.createOrUpdateSession(userId, roomId);
      return {
        success: true,
        room,
        message: 'Successfully joined room'
      };
    }

    // Check room type
    switch (room.roomType) {
      case RoomType.PUBLIC:
        // Public rooms - anyone can join with code
        room.participants.push(new mongoose.Types.ObjectId(userId));
        await room.save();
        await this.createOrUpdateSession(userId, roomId);
        return {
          success: true,
          room,
          message: 'Successfully joined public room with code'
        };

      case RoomType.PRIVATE:
        // Private rooms - join code grants access
        room.participants.push(new mongoose.Types.ObjectId(userId));
        await room.save();
        await this.createOrUpdateSession(userId, roomId);
        return {
          success: true,
          room,
          message: 'Successfully joined private room with code'
        };

      case RoomType.REQUEST_TO_JOIN:
        // Request to join rooms - even with code, need approval
        if (room.owner.toString() === userId) {
          room.participants.push(new mongoose.Types.ObjectId(userId));
          await room.save();
          await this.createOrUpdateSession(userId, roomId);
          return {
            success: true,
            room,
            message: 'Successfully joined room as owner'
          };
        }
        return {
          success: false,
          message: 'Room requires approval to join',
          requiresApproval: true
        };

      default:
        throw createError('Invalid room type', 400);
    }
  }

  static async requestToJoinRoom(data: JoinRequestData): Promise<{ message: string }> {
    const { roomId, userId, username } = data;
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    if (!room.isActive) {
      throw createError('Room is not active', 400);
    }

    if (room.roomType !== RoomType.REQUEST_TO_JOIN) {
      throw createError('This room does not require join requests', 400);
    }

    // Check if user is already a participant
    const isAlreadyParticipant = room.participants.some(
      participant => participant.toString() === userId
    );
    
    if (isAlreadyParticipant) {
      return { message: 'You are already a participant in this room' };
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
      userId: new mongoose.Types.ObjectId(userId),
      username,
      requestedAt: new Date()
    });

    await room.save();

    // Emit real-time event to room owner
    socketManager.getIO().to(room.owner.toString()).emit('join_request_received', {
      roomId,
      userId,
      username,
      requestedAt: new Date()
    });
    
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
    const isAlreadyParticipant = room.participants.some(
      participant => participant.toString() === requestUserId
    );
    
    if (!isAlreadyParticipant) {
      room.participants.push(new mongoose.Types.ObjectId(requestUserId));
    }

    await room.save();

    // Create session for the approved user
    await this.createOrUpdateSession(requestUserId, roomId);

    // Emit real-time events
    socketManager.getIO().to(requestUserId).emit('join_request_approved', {
      roomId,
      room,
      message: 'Your join request has been approved!'
    });

    // Notify room owner that request was processed
    socketManager.getIO().to(ownerId).emit('join_request_processed', {
      roomId,
      userId: requestUserId,
      action: 'approved'
    });

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

    // Emit real-time events
    socketManager.getIO().to(requestUserId).emit('join_request_rejected', {
      roomId,
      message: 'Your join request has been rejected.'
    });

    // Notify room owner that request was processed
    socketManager.getIO().to(ownerId).emit('join_request_processed', {
      roomId,
      userId: requestUserId,
      action: 'rejected'
    });
    
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

  static async removeCursor(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId);
    if (!room) {
      return null;
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

  private static async createOrUpdateSession(userId: string, roomId: string): Promise<void> {
    await Session.findOneAndUpdate(
      { userId, roomId, isActive: true },
      { joinedAt: new Date() },
      { upsert: true, new: true }
    );
  }
} 

export { RoomType };
