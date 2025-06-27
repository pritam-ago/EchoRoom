import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../../contexts/AuthContext';
import { roomService, Room } from '../../services/roomService';
import JoinRequests from '../rooms/JoinRequests';
import RoomInvite from '../rooms/RoomInvite';
import './CodeEditor.css';

interface Participant {
  userId: string;
  username: string;
  position?: { line: number; ch: number };
  color: string;
}

interface RoomData {
  id: string;
  name: string;
  language: string;
  code: string;
  participants: Participant[];
  createdAt: string;
  isPrivate: boolean;
}

const CodeEditor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [code, setCode] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    // Initialize socket connection
    const token = localStorage.getItem('token');
    socketRef.current = io('http://localhost:3001', {
      auth: { token }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // Join the room
      socket.emit('join-room', { roomId });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('room-data', (data: { code: string; language: string; cursors: Participant[]; participants: Participant[] }) => {
      setCode(data.code || '');
      setParticipants(data.participants || []);
      setLoading(false);
    });

    socket.on('code-updated', (data: { code: string; updatedBy: string }) => {
      if (data.updatedBy !== user.username) {
        setCode(data.code);
      }
    });

    socket.on('user-joined', (data: { userId: string; username: string }) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === data.userId);
        if (!existing) {
          return [...prev, { userId: data.userId, username: data.username, color: getRandomColor() }];
        }
        return prev;
      });
    });

    socket.on('user-left', (data: { userId: string; username: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    socket.on('cursor-updated', (cursor: Participant) => {
      setParticipants(prev => 
        prev.map(p => p.userId === cursor.userId ? { ...p, position: cursor.position } : p)
      );
    });

    socket.on('join-request-received', () => {
      if (isRoomOwner) {
        setPendingRequestsCount(prev => prev + 1);
      }
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    // Fetch room data
    fetchRoomData();

    return () => {
      if (socket) {
        socket.emit('leave-room', { roomId });
        socket.disconnect();
      }
    };
  }, [roomId, user]);

  const fetchRoomData = async () => {
    try {
      const roomData = await roomService.getRoomById(roomId!);
      // Transform the room data to include participants array
      const transformedRoom: RoomData = {
        id: roomData.id,
        name: roomData.name,
        language: roomData.language,
        code: roomData.code,
        participants: [], // Initialize with empty array, will be populated by socket events
        createdAt: roomData.createdAt,
        isPrivate: roomData.isPrivate
      };
      setRoom(transformedRoom);
      
      // Check if current user is room owner
      const ownerId = roomData.owner?._id;
      setIsRoomOwner(ownerId === user?.id);
      
      // If user is owner, fetch pending requests count
      if (ownerId === user?.id) {
        try {
          const requests = await roomService.getPendingRequests(roomId!);
          setPendingRequestsCount(requests.length);
        } catch (err) {
          // Ignore errors for pending requests
          console.log('Could not fetch pending requests');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch room data');
      setLoading(false);
    }
  };

  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add cursor change listener
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current && connected) {
        const position = {
          line: e.position.lineNumber,
          ch: e.position.column
        };
        
        socketRef.current.emit('cursor-move', {
          roomId,
          position,
          color: getRandomColor()
        });
      }
    });
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!value) return;
    
    setCode(value);
    
    if (socketRef.current && connected) {
      socketRef.current.emit('code-change', {
        roomId,
        code: value
      });
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="editor-container">
        <div className="loading">Loading editor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <header className="editor-header">
        <div className="header-left">
          <h1>{room?.name || 'Code Editor'}</h1>
          <span className="language-badge">{room?.language}</span>
        </div>
        
        <div className="header-center">
          <div className="connection-status">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="header-right">
          <div className="participants">
            <span className="participants-count">{participants.length} online</span>
            <div className="participants-list">
              {participants.map((participant) => (
                <div key={participant.userId} className="participant">
                  <span 
                    className="participant-color" 
                    style={{ backgroundColor: participant.color }}
                  ></span>
                  <span className="participant-name">{participant.username}</span>
                </div>
              ))}
            </div>
          </div>
          {isRoomOwner && (
            <button onClick={() => setShowInvite(true)} className="invite-button">
              Invite
            </button>
          )}
          {isRoomOwner && pendingRequestsCount > 0 && (
            <button
              onClick={() => setShowJoinRequests(true)}
              className="join-requests-button"
            >
              Join Requests ({pendingRequestsCount})
            </button>
          )}
          <button onClick={handleLeaveRoom} className="leave-button">
            Leave Room
          </button>
        </div>
      </header>

      <main className="editor-main">
        <Editor
          height="calc(100vh - 80px)"
          defaultLanguage={room?.language || 'javascript'}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 2,
          }}
        />
      </main>

      {showInvite && room && (
        <RoomInvite
          roomId={room.id}
          roomName={room.name}
          onClose={() => setShowInvite(false)}
        />
      )}
      {showJoinRequests && (
        <JoinRequests
          roomId={roomId!}
          onClose={() => setShowJoinRequests(false)}
          onRequestHandled={() => {
            setPendingRequestsCount(prev => Math.max(0, prev - 1));
          }}
        />
      )}
    </div>
  );
};

export default CodeEditor; 