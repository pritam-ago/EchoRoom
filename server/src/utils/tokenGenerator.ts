import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateRoomId = (): string => {
  return generateRandomString(12);
};

export const generateJoinCode = (): string => {
  // Generate a 6-character alphanumeric code, uppercase only for better readability
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}; 