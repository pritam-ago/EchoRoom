import { User, IUser } from '../models/User.js';
import { generateToken, TokenPayload } from '../utils/tokenGenerator.js';
import { createError } from '../middlewares/errorHandler.js';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  token: string;
}

export class AuthService {
  static async register(data: RegisterData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }]
    });

    if (existingUser) {
      throw createError('User with this email or username already exists', 400);
    }

    // Create new user
    const user = new User(data);
    await user.save();

    // Generate token
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const token = generateToken(tokenPayload);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    };
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    // Find user by email
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const token = generateToken(tokenPayload);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    };
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
} 