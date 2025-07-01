import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../../contexts/AuthContext';
import { roomService, Room } from '../../services/roomService';
import JoinRequests from '../rooms/JoinRequests';
import RoomInvite from '../rooms/RoomInvite';
import WaitingRoom from '../rooms/WaitingRoom';
import Notification from '../rooms/Notification';
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
  roomType: 'public' | 'private' | 'request_to_join';
}

interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Add notification function
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  // Remove notification function
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    if (!roomId || !user) return;

    // Debug: Log the roomId being used
    console.log('CodeEditor: roomId from URL params:', roomId);

    // Initialize socket connection
    const token = localStorage.getItem('token');
    socketRef.current = io('http://localhost:3001', {
      auth: { token }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      // Log user ID for debugging
      console.log('Current user ID:', user?.id);
      
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

    // Listen for when the current user joins the room
    socket.on('user-joined', (data: { userId: string; username: string }) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === data.userId);
        if (!existing) {
          return [...prev, { userId: data.userId, username: data.username, color: getRandomColor() }];
        }
        return prev;
      });
      
      // Show notification for room owner when someone joins
      if (isRoomOwner) {
        addNotification(`${data.username} joined the room`, 'success');
      }
      
      // If the current user joined, clear waiting state and refresh room data
      if (data.userId === user?.id) {
        console.log('Current user joined the room, clearing waiting state');
        setWaitingForApproval(false);
        setApprovalMessage('');
        // Refresh room data to ensure we have the latest state
        fetchRoomData();
      }
    });

    socket.on('user-left', (data: { userId: string; username: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      
      // Show notification for room owner when someone leaves
      if (isRoomOwner) {
        addNotification(`${data.username} left the room`, 'info');
      }
    });

    socket.on('cursor-updated', (cursor: Participant) => {
      setParticipants(prev => 
        prev.map(p => p.userId === cursor.userId ? { ...p, position: cursor.position } : p)
      );
    });

    // Helper to fetch latest pending requests count
    const fetchPendingRequestsCount = async () => {
      try {
        const requests = await roomService.getPendingRequests(roomId!);
        setPendingRequestsCount(requests.length);
      } catch (err) {
        // Optionally handle error
      }
    };

    // Real-time join request for host
    socket.on('join_request_received', (data) => {
      if (isRoomOwner) {
        fetchPendingRequestsCount();
        addNotification(`New join request from ${data.username}`, 'info');
        console.log('New join request received:', data);
      }
    });

    // Real-time approval for waiting user
    socket.on('join_request_approved', (data) => {
      console.log('join_request_approved event received', data);
      setWaitingForApproval(false);
      setApprovalMessage('Your join request has been approved! Redirecting...');
      addNotification('Your join request has been approved!', 'success');
      setTimeout(() => {
        window.location.href = `/room/${roomId}`;
      }, 1000);
    });

    // Real-time rejection for waiting user
    socket.on('join_request_rejected', (data) => {
      console.log('Join request rejected:', data);
      setWaitingForApproval(false);
      setApprovalMessage('Your join request has been rejected.');
      addNotification('Your join request has been rejected.', 'error');
    });

    // Real-time notification for room owner when request is processed
    socket.on('join_request_processed', (data) => {
      if (isRoomOwner) {
        fetchPendingRequestsCount();
        const action = data.action === 'approved' ? 'approved' : 
                      data.action === 'rejected' ? 'rejected' : 'cancelled';
        addNotification(`Join request ${action}`, 'info');
        console.log('Join request processed:', data);
      }
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket Error]', data.message);
      // Only show notification for cursor errors if not 403/404
      if (!data.message.includes('cursor') || (!data.message.includes('403') && !data.message.includes('404'))) {
        setError(data.message);
        addNotification(data.message, 'error');
      }
    });

    // Fetch room data
    fetchRoomData();

    return () => {
      if (socket) {
        socket.emit('leave-room', { roomId });
        socket.disconnect();
      }
    };
  }, [roomId, user, isRoomOwner]);

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
        roomType: roomData.roomType
      };
      setRoom(transformedRoom);
      
      // Check if current user is room owner
      const ownerId = roomData.owner?._id;
      const isOwner = ownerId === user?.id;
      setIsRoomOwner(isOwner);
      
      // Check if user is a participant (handle both string and object formats)
      const isParticipant = roomData.participants?.some((p: any) => {
        const participantId = typeof p === 'string' ? p : p._id || p.userId;
        return participantId === user?.id;
      });
      
      // If user is not the owner and not a participant, they might be waiting for approval
      if (!isOwner && !isParticipant) {
        // Check if user has a pending join request
        try {
          const hasPendingRequest = await roomService.hasPendingRequest(roomId!);
          
          if (hasPendingRequest) {
            setWaitingForApproval(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          // If we can't check pending requests, assume they need to wait for approval
          if (roomData.roomType === 'request_to_join') {
            setWaitingForApproval(true);
            setLoading(false);
            return;
          }
        }
      } else if (isParticipant) {
        // User is a participant, make sure waiting state is cleared
        setWaitingForApproval(false);
        setApprovalMessage('');
      }
      
      // If user is owner, fetch pending requests count
      if (isOwner) {
        try {
          const requests = await roomService.getPendingRequests(roomId!);
          setPendingRequestsCount(requests.length);
        } catch (err) {
          // Ignore errors for pending requests
          console.log('Could not fetch pending requests');
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch room data');
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
      // Only emit if user is a participant
      const isParticipant = participants.some(p => p.userId === user?.id);
      if (socketRef.current && connected && isParticipant) {
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

  if (waitingForApproval) {
    return (
      <div className="editor-container">
        <WaitingRoom
          roomId={roomId!}
          onApproved={() => {
            setWaitingForApproval(false);
            window.location.href = `/room/${roomId}`;
          }}
          onRejected={() => {
            setWaitingForApproval(false);
            setApprovalMessage('Your join request has been rejected.');
          }}
        />
      </div>
    );
  }

  if (approvalMessage) {
    return (
      <div className="editor-container">
        <div className="waiting-modal">
          <div className="waiting-content">
            <h2>{approvalMessage}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

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
              {participants.map((participant, idx) => (
                <div key={participant.userId || idx} className="participant">
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
          {isRoomOwner && (
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