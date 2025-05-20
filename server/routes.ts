import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { generateRoomCode } from "@/lib/utils";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Connection tracking
  const rooms = new Map<string, Set<WebSocket>>();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'join':
            handleJoin(ws, data.room, data.userId);
            break;
            
          case 'leave':
            handleLeave(ws, data.room, data.userId);
            break;
            
          case 'message':
            handleMessage(ws, data);
            break;
            
          case 'create_room':
            handleCreateRoom(ws, data);
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Remove the client from all rooms
      rooms.forEach((clients, roomCode) => {
        if (clients.has(ws)) {
          clients.delete(ws);
          
          // If the room is empty, remove it
          if (clients.size === 0) {
            rooms.delete(roomCode);
          }
        }
      });
    });
  });
  
  // Handle joining a room
  async function handleJoin(ws: WebSocket, roomCode: string, userId: string) {
    if (!roomCode) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room code is required'
      }));
      return;
    }
    
    // Get or create the room
    const room = await storage.getRoomByCode(roomCode);
    
    if (!room) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room not found'
      }));
      return;
    }
    
    // Add the client to the room
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }
    
    // Store the room code and user ID on the WebSocket object for reference
    (ws as any).roomCode = roomCode;
    (ws as any).userId = userId;
    
    rooms.get(roomCode)!.add(ws);
    
    // Store the user in the room
    await storage.addUserToRoom(roomCode, userId);
    
    // Send the user the room details
    ws.send(JSON.stringify({
      type: 'join',
      roomId: room.id,
      roomName: room.name,
      roomCode: room.code,
      userCount: rooms.get(roomCode)!.size,
      timestamp: new Date().toISOString()
    }));
    
    // Broadcast a join message to all clients in the room
    broadcastToRoom(roomCode, {
      type: 'join',
      roomCode,
      userId,
      message: `User ${userId} joined the room`,
      userCount: rooms.get(roomCode)!.size,
      timestamp: new Date().toISOString()
    });
    
    // Send the room history to the client
    const messages = await storage.getMessagesByRoomCode(roomCode);
    messages.forEach(message => {
      ws.send(JSON.stringify({
        type: message.type || 'message',
        roomCode,
        userId: message.userId,
        message: message.content,
        timestamp: message.timestamp
      }));
    });
  }
  
  // Handle leaving a room
  async function handleLeave(ws: WebSocket, roomCode: string, userId: string) {
    if (!roomCode) return;
    
    // Remove the client from the room
    if (rooms.has(roomCode)) {
      const clients = rooms.get(roomCode)!;
      clients.delete(ws);
      
      await storage.removeUserFromRoom(roomCode, userId);
      
      // Broadcast a leave message to all clients in the room
      broadcastToRoom(roomCode, {
        type: 'leave',
        roomCode,
        userId,
        message: `User ${userId} left the room`,
        userCount: clients.size,
        timestamp: new Date().toISOString()
      });
      
      // If the room is empty, remove it
      if (clients.size === 0) {
        rooms.delete(roomCode);
      }
    }
  }
  
  // Handle chat messages
  async function handleMessage(ws: WebSocket, data: any) {
    const { room: roomCode, userId, message, timestamp } = data;
    
    if (!roomCode || !message) return;
    
    // Store the message
    await storage.createMessage({
      roomId: 0, // This will be set in the storage layer
      userId,
      content: message,
      type: 'message'
    }, roomCode);
    
    // Broadcast the message to all clients in the room
    broadcastToRoom(roomCode, {
      type: 'message',
      roomCode,
      userId,
      message,
      timestamp: timestamp || new Date().toISOString()
    });
  }
  
  // Handle room creation
  async function handleCreateRoom(ws: WebSocket, data: any) {
    const { userId, roomName, message: description } = data;
    
    if (!roomName) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room name is required'
      }));
      return;
    }
    
    // Generate a unique room code
    const roomCode = generateRoomCode();
    
    // Create the room
    const room = await storage.createRoom({
      name: roomName,
      code: roomCode,
      description: description || ''
    });
    
    // Add the user to the room
    await storage.addUserToRoom(roomCode, userId);
    
    // Initialize the room in memory
    rooms.set(roomCode, new Set([ws]));
    
    // Store the room code and user ID on the WebSocket object for reference
    (ws as any).roomCode = roomCode;
    (ws as any).userId = userId;
    
    // Send the room details to the client
    ws.send(JSON.stringify({
      type: 'create_room',
      roomId: room.id,
      roomName: room.name,
      roomCode: room.code,
      message: description,
      userCount: 1,
      timestamp: new Date().toISOString()
    }));
    
    // Send a system message to the room
    await storage.createMessage({
      roomId: 0,
      userId: 'system',
      content: `Room created by ${userId}`,
      type: 'system'
    }, roomCode);
    
    // Join the room automatically
    handleJoin(ws, roomCode, userId);
  }
  
  // Broadcast a message to all clients in a room
  function broadcastToRoom(roomCode: string, message: any) {
    if (!rooms.has(roomCode)) return;
    
    const clients = rooms.get(roomCode)!;
    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
  
  return httpServer;
}
