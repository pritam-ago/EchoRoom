# EchoRoom Server

A real-time collaborative code editor backend built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- 🔐 JWT-based authentication
- 👥 Real-time collaborative code editing
- 🖱️ Live cursor tracking
- 🏠 Room management
- 📊 User session tracking
- 🔒 Rate limiting and security
- 🚀 TypeScript support

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── sockets/         # Socket.IO handlers
│   ├── middlewares/     # Custom middleware
│   ├── utils/           # Helper functions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── package.json
├── tsconfig.json
└── env.example
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and navigate to server directory**

   ```bash
   cd server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/echoroom
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB** (if using local instance)

   ```bash
   mongod
   ```

5. **Run the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Rooms

- `GET /api/rooms/public` - Get public rooms
- `GET /api/rooms/:roomId` - Get specific room
- `POST /api/rooms` - Create new room (protected)
- `GET /api/rooms/user/rooms` - Get user's rooms (protected)
- `PUT /api/rooms/:roomId` - Update room (protected)
- `DELETE /api/rooms/:roomId` - Delete room (protected)
- `POST /api/rooms/:roomId/join` - Join room (protected)
- `POST /api/rooms/:roomId/leave` - Leave room (protected)

### Health Check

- `GET /health` - Server health status

## Socket.IO Events

### Client to Server

- `join-room` - Join a collaborative room
- `leave-room` - Leave a room
- `code-change` - Broadcast code changes
- `cursor-move` - Update cursor position

### Server to Client

- `user-joined` - User joined the room
- `user-left` - User left the room
- `room-data` - Initial room data
- `code-updated` - Code was updated by another user
- `cursor-updated` - Cursor position updated
- `error` - Error message

## Environment Variables

| Variable                  | Description               | Default                              |
| ------------------------- | ------------------------- | ------------------------------------ |
| `PORT`                    | Server port               | `3001`                               |
| `NODE_ENV`                | Environment               | `development`                        |
| `MONGODB_URI`             | MongoDB connection string | `mongodb://localhost:27017/echoroom` |
| `JWT_SECRET`              | JWT signing secret        | Required                             |
| `JWT_EXPIRES_IN`          | JWT expiration time       | `7d`                                 |
| `CORS_ORIGIN`             | Allowed CORS origin       | `http://localhost:3000`              |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window         | `900000` (15 min)                    |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window   | `100`                                |

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests

### Code Style

The project uses TypeScript with strict type checking. Make sure to:

- Use proper TypeScript types
- Follow ESLint rules
- Write meaningful commit messages
- Add tests for new features

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Joi
- SQL injection protection (MongoDB)

## Database Models

### User

- username, email, password
- avatar, online status, last seen
- Password hashing middleware

### Room

- name, description, owner
- participants, code content, language
- cursors, public/private settings

### Session

- user participation tracking
- join/leave timestamps
- session duration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
