import mongoose, { Document, Schema } from 'mongoose';

export interface IUserCursor {
  userId: string;
  username: string;
  position: {
    line: number;
    ch: number;
  };
  color: string;
}

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  REQUEST_TO_JOIN = 'request_to_join'
}

export interface IRoom extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  code: string;
  language: string;
  cursors: IUserCursor[];
  roomType: RoomType;
  isActive: boolean;
  joinCode?: string;
  pendingRequests: Array<{
    userId: mongoose.Types.ObjectId;
    username: string;
    requestedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const userCursorSchema = new Schema<IUserCursor>({
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  position: {
    line: {
      type: Number,
      required: true,
      default: 0,
    },
    ch: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  color: {
    type: String,
    required: true,
    default: '#007acc',
  },
});

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  code: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: 'javascript',
  },
  cursors: [userCursorSchema],
  roomType: {
    type: String,
    enum: Object.values(RoomType),
    default: RoomType.PUBLIC,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  joinCode: {
    type: String,
  },
  pendingRequests: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    username: {
      type: String,
    },
    requestedAt: {
      type: Date,
    },
  }],
}, {
  timestamps: true,
});

// Index for better query performance
roomSchema.index({ owner: 1, isActive: 1 });
roomSchema.index({ roomType: 1, isActive: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema); 