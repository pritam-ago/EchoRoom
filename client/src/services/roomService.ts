import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface Room {
  id: string;
  _id?: string;
  name: string;
  language: string;
  code: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  }>;
  owner?: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  roomType: 'public' | 'private' | 'request_to_join';
}

export interface CreateRoomData {
  name: string;
  language: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
}

class RoomService {
  async getRooms(): Promise<Room[]> {
    const response = await api.get('/rooms/public');
    return response.data.data.map((room: any) => ({
      ...room,
      id: (room.id || room._id || '') as string,
    }));
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    // Map boolean fields to roomType enum
    let roomType = 'public'; // default
    if (data.requiresApproval) {
      roomType = 'request_to_join';
    } else if (data.isPrivate) {
      roomType = 'private';
    }

    const response = await api.post('/rooms', {
      name: data.name,
      language: data.language,
      roomType: roomType
    });
    const room = response.data.data;
    return { ...room, id: (room.id || room._id || '') as string };
  }

  async getRoomById(roomId: string): Promise<Room> {
    const response = await api.get(`/rooms/${roomId}`);
    const room = response.data.data;
    return { ...room, id: (room.id || room._id || '') as string };
  }

  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/join`);
  }

  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/leave`);
  }

  async generateJoinCode(roomId: string): Promise<{ joinCode: string }> {
    const response = await api.post(`/rooms/${roomId}/join-code`);
    return response.data.data;
  }

  async joinRoomWithCode(joinCode: string): Promise<Room> {
    const response = await api.post('/rooms/join-with-code', { joinCode });
    const room = response.data.data;
    return { ...room, id: (room.id || room._id || '') as string };
  }

  async getRoomByJoinCode(joinCode: string): Promise<Room> {
    const response = await api.get(`/rooms/join-code/${joinCode}`);
    const room = response.data.data;
    return { ...room, id: (room.id || room._id || '') as string };
  }

  async requestJoinRoom(roomId: string): Promise<{ message: string }> {
    const response = await api.post(`/rooms/${roomId}/request-to-join`);
    return { message: response.data.message };
  }

  async approveJoinRequest(roomId: string, requestUserId: string): Promise<Room> {
    const response = await api.post(`/rooms/${roomId}/approve/${requestUserId}`);
    const room = response.data.data;
    return { ...room, id: (room.id || room._id || '') as string };
  }

  async rejectJoinRequest(roomId: string, requestUserId: string): Promise<{ message: string }> {
    const response = await api.post(`/rooms/${roomId}/reject/${requestUserId}`);
    return { message: response.data.message };
  }

  async getPendingRequests(roomId: string): Promise<any[]> {
    const response = await api.get(`/rooms/${roomId}/pending-requests`);
    return response.data.data;
  }

  async cancelJoinRequest(roomId: string): Promise<{ message: string }> {
    const response = await api.post(`/rooms/${roomId}/cancel-request`);
    return { message: response.data.message };
  }

  async hasPendingRequest(roomId: string): Promise<boolean> {
    const response = await api.get(`/rooms/${roomId}/has-pending-request`);
    return response.data.data.hasPending;
  }
}

export const roomService = new RoomService(); 