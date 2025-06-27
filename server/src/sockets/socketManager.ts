import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken, TokenPayload } from '../utils/tokenGenerator.js';
import { RoomService } from '../services/roomService.js';
import { User } from '../models/User.js';

export interface AuthenticatedSocket {
  userId: string;
  username: string;
  email: string;
  roomId?: string;
}

export class SocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        // Update user online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        socket.data.user = {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
        };

        this.connectedUsers.set(decoded.userId, socket.data.user);
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.data.user.username}`);

      // Join room
      socket.on('join-room', async (data: { roomId: string }) => {
        try {
          const { roomId } = data;
          const user = socket.data.user;

          // Join the room
          await RoomService.joinRoom(roomId, user.userId);
          socket.join(roomId);
          socket.data.roomId = roomId;

          // Notify others in the room
          socket.to(roomId).emit('user-joined', {
            userId: user.userId,
            username: user.username,
          });

          // Get room data and send to the user
          const room = await RoomService.getRoomById(roomId);
          if (room) {
            socket.emit('room-data', {
              code: room.code,
              language: room.language,
              cursors: room.cursors,
              participants: room.participants,
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Leave room
      socket.on('leave-room', async (data: { roomId: string }) => {
        try {
          const { roomId } = data;
          const user = socket.data.user;

          await RoomService.leaveRoom(roomId, user.userId);
          socket.leave(roomId);
          socket.data.roomId = undefined;

          // Remove cursor
          await RoomService.removeCursor(roomId, user.userId);

          // Notify others
          socket.to(roomId).emit('user-left', {
            userId: user.userId,
            username: user.username,
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to leave room' });
        }
      });

      // Code change
      socket.on('code-change', async (data: { roomId: string; code: string }) => {
        try {
          const { roomId, code } = data;
          const user = socket.data.user;

          // Update code in database
          await RoomService.updateCode(roomId, code);

          // Broadcast to other users in the room
          socket.to(roomId).emit('code-updated', {
            code,
            updatedBy: user.username,
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to update code' });
        }
      });

      // Cursor movement
      socket.on('cursor-move', async (data: { roomId: string; position: { line: number; ch: number }; color: string }) => {
        try {
          const { roomId, position, color } = data;
          const user = socket.data.user;

          const cursor = {
            userId: user.userId,
            username: user.username,
            position,
            color,
          };

          // Update cursor in database
          await RoomService.updateCursor(roomId, cursor);

          // Broadcast to other users
          socket.to(roomId).emit('cursor-updated', cursor);
        } catch (error) {
          socket.emit('error', { message: 'Failed to update cursor' });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        try {
          const user = socket.data.user;
          if (user) {
            // Update user offline status
            await User.findByIdAndUpdate(user.userId, {
              isOnline: false,
              lastSeen: new Date(),
            });

            // Remove from connected users
            this.connectedUsers.delete(user.userId);

            // Leave room if in one
            if (socket.data.roomId) {
              await RoomService.leaveRoom(socket.data.roomId, user.userId);
              await RoomService.removeCursor(socket.data.roomId, user.userId);

              socket.to(socket.data.roomId).emit('user-left', {
                userId: user.userId,
                username: user.username,
              });
            }
          }

          console.log(`User disconnected: ${user?.username || 'Unknown'}`);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getConnectedUsers(): Map<string, AuthenticatedSocket> {
    return this.connectedUsers;
  }
} 