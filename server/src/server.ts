import { createServer } from 'http';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import app from './app.js';
import { SocketManager } from './sockets/socketManager.js';

const server = createServer(app);

// Initialize Socket.IO
export const socketManager = new SocketManager(server);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      await disconnectDatabase();
      console.log('✅ Database disconnected');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    server.listen(config.server.port, () => {
      console.log(`🚀 EchoRoom server running on port ${config.server.port}`);
      console.log(`📡 Environment: ${config.server.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.server.port}/health`);
      console.log(`🔌 Socket.IO ready for real-time collaboration`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 