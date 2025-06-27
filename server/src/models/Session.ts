import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  totalTime?: number; // in minutes
}

const sessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalTime: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for better query performance
sessionSchema.index({ userId: 1, roomId: 1 });
sessionSchema.index({ isActive: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema); 