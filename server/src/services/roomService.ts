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

    if (isAlreadyParticipant) {
      await this.createOrUpdateSession(userId, roomId);
      return {
        success: true,
        room,
        message: 'Successfully joined room'
      };
    }

    switch (room.roomType) {
      case RoomType.PUBLIC:
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
    
    // First check if room exists and is valid for requests
    const roomCheck = await Room.findById(roomId);
    
    if (!roomCheck) {
      throw createError('Room not found', 404);
    }

    if (!roomCheck.isActive) {
      throw createError('Room is not active', 400);
    }

    if (roomCheck.roomType !== RoomType.REQUEST_TO_JOIN) {
      throw createError('This room does not require join requests', 400);
    }

    // Check if user is already a participant
    const isAlreadyParticipant = roomCheck.participants.some(
      participant => participant.toString() === userId
    );
    
    if (isAlreadyParticipant) {
      return { message: 'You are already a participant in this room' };
    }

    // Use atomic operation to add request and prevent duplicates
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        isActive: true,
        roomType: RoomType.REQUEST_TO_JOIN,
        participants: { $ne: userId },
        'pendingRequests.userId': { $ne: userId }
      },
      {
        $push: {
          pendingRequests: {
            userId: new mongoose.Types.ObjectId(userId),
            username,
            requestedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!room) {
      // Check if it's because user already has a pending request
      const existingRoom = await Room.findOne({
        _id: roomId,
        'pendingRequests.userId': userId
      });
      
      if (existingRoom) {
        throw createError('You already have a pending request for this room', 400);
      }
      
      throw createError('Unable to send join request', 400);
    }

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
    console.log(roomId, ownerId, requestUserId);

    const roomBeforeUpdate = await Room.findById(roomId)
      .populate('pendingRequests.userId', 'username email avatar');
    
    if (!roomBeforeUpdate) {
      throw createError('Room not found', 404);
    }
    console.log(roomBeforeUpdate.pendingRequests);

    const pendingRequest = roomBeforeUpdate.pendingRequests.find((req: any) => {
      if (typeof req.userId === 'object' && req.userId._id) {
        return req.userId._id.toString() === requestUserId;
      }
      return req.userId.toString() === requestUserId;
    });
    console.log(pendingRequest);
    
    if (!pendingRequest) {
      throw createError('Join request not found', 404);
    }

    const username = typeof pendingRequest.userId === 'object' && 'username' in pendingRequest.userId ? 
      (pendingRequest.userId as any).username : 'Unknown User';

    // Use atomic operation to prevent concurrency issues
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        owner: ownerId,
        'pendingRequests.userId': new mongoose.Types.ObjectId(requestUserId)
      },
      {
        $pull: { pendingRequests: { userId: new mongoose.Types.ObjectId(requestUserId) } },
        $addToSet: { participants: new mongoose.Types.ObjectId(requestUserId) }
      },
      { new: true }
    );
    
    if (!room) {
      throw createError('Room not found or join request not found', 404);
    }

    // Create session for the approved user
    await this.createOrUpdateSession(requestUserId, roomId);

    // Emit real-time events
    socketManager.getIO().to(requestUserId).emit('join_request_approved', {
      roomId,
      room,
      message: 'Your join request has been approved!'
    });

    // Emit user-joined event to notify all users in the room
    socketManager.getIO().to(roomId).emit('user-joined', {
      userId: requestUserId,
      username: username
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
    // Use atomic operation to prevent concurrency issues
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        owner: ownerId,
        'pendingRequests.userId': new mongoose.Types.ObjectId(requestUserId)
      },
      {
        $pull: { pendingRequests: { userId: new mongoose.Types.ObjectId(requestUserId) } }
      },
      { new: true }
    );
    
    if (!room) {
      throw createError('Room not found or join request not found', 404);
    }

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

  static async cancelJoinRequest(roomId: string, userId: string): Promise<{ message: string }> {
    // Use atomic operation to prevent concurrency issues
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        'pendingRequests.userId': new mongoose.Types.ObjectId(userId)
      },
      {
        $pull: { pendingRequests: { userId: new mongoose.Types.ObjectId(userId) } }
      },
      { new: true }
    );
    
    if (!room) {
      throw createError('Room not found or join request not found', 404);
    }

    // Notify room owner that request was cancelled
    socketManager.getIO().to(room.owner.toString()).emit('join_request_processed', {
      roomId,
      userId,
      action: 'cancelled'
    });
    
    return { message: 'Join request cancelled successfully' };
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

  static async hasPendingRequest(roomId: string, userId: string): Promise<boolean> {
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw createError('Room not found', 404);
    }

    return room.pendingRequests.some((req: any) => 
      req.userId.toString() === userId
    );
  }

  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    // Use atomic operation to prevent concurrency issues
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        owner: { $ne: userId } // Only allow non-owners to leave
      },
      {
        $pull: { participants: userId }
      },
      { new: true }
    );

    if (!room) {
      // Check if user is the owner
      const ownerCheck = await Room.findOne({ _id: roomId, owner: userId });
      if (ownerCheck) {
        throw createError('Room owner cannot leave the room', 400);
      }
      throw createError('Room not found', 404);
    }

    // Update session
    await Session.findOneAndUpdate(
      { userId, roomId, isActive: true },
      { leftAt: new Date(), isActive: false }
    );
  }

  static async updateCode(roomId: string, code: string): Promise<IRoom> {
    const room = await Room.findOneAndUpdate(
      { _id: roomId },
      { code },
      { new: true }
    );
    
    if (!room) {
      throw createError('Room not found', 404);
    }
    
    return room;
  }

  static async updateCursor(roomId: string, cursor: IUserCursor): Promise<IRoom> {
    console.log(`[updateCursor] Attempting update: roomId=${roomId}, userId=${cursor.userId}, position=${JSON.stringify(cursor.position)}, color=${cursor.color}`);
    const room = await Room.findById(roomId);
    if (!room) {
      console.error(`[updateCursor] Room not found: roomId=${roomId}, userId=${cursor.userId}`);
      throw createError('Room not found', 404);
    }
    const isParticipant = room.participants.some(
      participant => participant.toString() === cursor.userId
    );
    if (!isParticipant) {
      console.error(`[updateCursor] User is not a participant: roomId=${roomId}, userId=${cursor.userId}`);
      throw createError('User is not a participant in this room', 403);
    }
    try {
      const updatedRoom = await Room.findOneAndUpdate(
        { _id: roomId },
        {
          $pull: { cursors: { userId: cursor.userId } },
          $push: { cursors: cursor }
        },
        { new: true }
      );
      console.log(`[updateCursor] Success: roomId=${roomId}, userId=${cursor.userId}`);
      return updatedRoom!;
    } catch (error) {
      console.error(`[updateCursor] Error: roomId=${roomId}, userId=${cursor.userId}`, error);
      throw error;
    }
  }

  static async removeCursor(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findOneAndUpdate(
      { _id: roomId },
      { $pull: { cursors: { userId } } },
      { new: true }
    );
    
    return room;
  }

  static async generateJoinCode(roomId: string, userId: string): Promise<{ joinCode: string }> {
    // First check if user is the owner
    const roomCheck = await Room.findOne({ _id: roomId, owner: userId });
    
    if (!roomCheck) {
      throw createError('Room not found or you are not the owner', 404);
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

    // Use atomic operation to update the join code
    const room = await Room.findOneAndUpdate(
      { _id: roomId, owner: userId },
      { joinCode: joinCode! },
      { new: true }
    );
    
    if (!room) {
      throw createError('Failed to generate join code', 500);
    }
    
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
