import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting - more lenient in development
const isDevelopment = config.server.nodeEnv === 'development';

// Global rate limiter (more lenient in development)
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 1000 : config.rateLimit.maxRequests, // 1000 requests in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 10, // 50 attempts in development, 10 in production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Development endpoint to reset rate limits (only in development)
if (isDevelopment) {
  app.post('/api/dev/reset-rate-limit', (req, res) => {
    // This will reset the rate limit for the current IP
    res.status(200).json({
      message: 'Rate limit reset for development',
      timestamp: new Date().toISOString(),
    });
  });
}

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

export default app; 