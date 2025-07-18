# EchoRoom - Real-time Collaborative Code Editor

A modern, real-time collaborative code editor built with React, TypeScript, Node.js, and Socket.IO. Multiple users can edit code simultaneously with live cursor tracking and syntax highlighting.

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit code simultaneously
- **Live Cursor Tracking**: See where other users are typing in real-time
- **Syntax Highlighting**: Support for 17+ programming languages
- **User Authentication**: Secure login and registration system
- **Room Management**: Create and join collaborative coding sessions
- **Modern UI**: Beautiful, responsive design with dark theme support
- **WebSocket Communication**: Real-time updates using Socket.IO
- **Monaco Editor**: Professional code editing experience

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Monaco Editor** for code editing
- **Socket.IO Client** for real-time communication
- **React Router** for navigation
- **Axios** for API calls
- **Modern CSS** with responsive design

### Backend

- **Node.js** with TypeScript
- **Express.js** for REST API
- **Socket.IO** for real-time features
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing

## 📁 Project Structure

```
echoroom/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/      # Authentication components
│   │   │   ├── editor/    # Code editor components
│   │   │   └── rooms/     # Room management components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # Socket.IO handlers
│   │   ├── middlewares/   # Express middlewares
│   │   └── utils/         # Utility functions
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd echoroom
   ```

2. **Set up the backend**

   ```bash
   cd server
   npm install
   ```

3. **Create environment file**

   ```bash
   cp env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/echoroom
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Set up the frontend**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server**

   ```bash
   cd server
   npm run dev
   ```

   The server will start on `http://localhost:3001`

2. **Start the frontend development server**

   ```bash
   cd client
   npm start
   ```

   The client will start on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000` to start using EchoRoom

## 📖 Usage

1. **Register/Login**: Create an account or sign in with existing credentials
2. **Create a Room**: Start a new collaborative coding session
3. **Join a Room**: Join existing rooms from the room list
4. **Collaborate**: Edit code together with real-time updates
5. **See Cursors**: View other users' cursor positions in real-time

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Rooms

- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms/:id/join` - Join a room
- `POST /api/rooms/:id/leave` - Leave a room

### Socket.IO Events

- `join-room` - Join a collaborative room
- `leave-room` - Leave a room
- `code-change` - Broadcast code changes
- `cursor-move` - Broadcast cursor movements
- `user-joined` - Notify when user joins
- `user-left` - Notify when user leaves

## 🎨 Supported Languages

- JavaScript
- TypeScript
- Python
- Java
- C++
- C#
- PHP
- Ruby
- Go
- Rust
- HTML
- CSS
- JSON
- Markdown
- SQL
- YAML
- XML

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- Helmet.js security headers

## 🚀 Deployment

### Backend Deployment

1. Build the TypeScript code:

   ```bash
   cd server
   npm run build
   ```

2. Set production environment variables
3. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment

1. Build the React app:

   ```bash
   cd client
   npm run build
   ```

2. Deploy the `build` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
- [React](https://reactjs.org/) - The JavaScript library for building user interfaces
- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework for Node.js

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the development team.
