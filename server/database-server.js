// Database-backed server for deployment on traditional hosting
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');

// Create Express app
const app = express();
const server = http.createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws' 
});

// Create connection to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Connection tracking
const rooms = new Map();

// Initialize database tables
async function initDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);
    
    // Create rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT
      )
    `);
    
    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT,
        type TEXT
      )
    `);
    
    // Create room_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_users (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        joined TEXT
      )
    `);
    
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Database storage implementation
const storage = {
  // Room operations
  async getRooms() {
    const { rows } = await pool.query('SELECT * FROM rooms');
    return rows;
  },
  
  async getRoom(id) {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    return rows[0];
  },
  
  async getRoomByCode(code) {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
    return rows[0];
  },
  
  async createRoom(room) {
    const { rows } = await pool.query(
      'INSERT INTO rooms (name, code, description, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [room.name, room.code, room.description, new Date().toISOString()]
    );
    return rows[0];
  },
  
  // Message operations
  async getMessages(roomId) {
    const { rows } = await pool.query('SELECT * FROM messages WHERE room_id = $1', [roomId]);
    return rows;
  },
  
  async getMessagesByRoomCode(roomCode) {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return [];
    
    const { rows } = await pool.query('SELECT * FROM messages WHERE room_id = $1', [room.id]);
    return rows;
  },
  
  async createMessage(message, roomCode) {
    // Find room or create if it doesn't exist
    let room = await this.getRoomByCode(roomCode);
    
    if (!room) {
      room = await this.createRoom({
        name: `Room ${roomCode}`,
        code: roomCode,
        description: 'Auto-created room'
      });
    }
    
    const { rows } = await pool.query(
      'INSERT INTO messages (room_id, user_id, content, timestamp, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [room.id, message.userId, message.content, new Date().toISOString(), message.type || 'message']
    );
    
    return rows[0];
  },
  
  // RoomUser operations
  async getUsersInRoom(roomId) {
    const { rows } = await pool.query('SELECT user_id FROM room_users WHERE room_id = $1', [roomId]);
    return rows.map(row => row.user_id);
  },
  
  async getUsersInRoomByCode(roomCode) {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return [];
    
    return this.getUsersInRoom(room.id);
  },
  
  async addUserToRoom(roomCode, userId) {
    let room = await this.getRoomByCode(roomCode);
    
    if (!room) {
      room = await this.createRoom({
        name: `Room ${roomCode}`,
        code: roomCode,
        description: 'Auto-created room'
      });
    }
    
    // Check if user is already in room
    const users = await this.getUsersInRoom(room.id);
    if (users.includes(userId)) return;
    
    await pool.query(
      'INSERT INTO room_users (room_id, user_id, joined) VALUES ($1, $2, $3)',
      [room.id, userId, new Date().toISOString()]
    );
  },
  
  async removeUserFromRoom(roomCode, userId) {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return;
    
    await pool.query(
      'DELETE FROM room_users WHERE room_id = $1 AND user_id = $2',
      [room.id, userId]
    );
  }
};

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Handle messages from clients
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle different message types
      switch (data.type) {
        case 'join':
          await handleJoin(ws, data.room, data.userId);
          break;
          
        case 'leave':
          await handleLeave(ws, data.room, data.userId);
          break;
          
        case 'message':
          await handleMessage(ws, data);
          break;
          
        case 'create_room':
          await handleCreateRoom(ws, data);
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
async function handleJoin(ws, roomCode, userId) {
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
  ws.roomCode = roomCode;
  ws.userId = userId;
  
  rooms.get(roomCode).add(ws);
  
  // Store the user in the room
  await storage.addUserToRoom(roomCode, userId);
  
  // Send the user the room details
  ws.send(JSON.stringify({
    type: 'join',
    roomId: room.id,
    roomName: room.name,
    roomCode: room.code,
    userCount: rooms.get(roomCode).size,
    timestamp: new Date().toISOString()
  }));
  
  // Broadcast a join message to all clients in the room
  broadcastToRoom(roomCode, {
    type: 'join',
    roomCode,
    userId,
    message: `User ${userId} joined the room`,
    userCount: rooms.get(roomCode).size,
    timestamp: new Date().toISOString()
  });
  
  // Send the room history to the client
  const messages = await storage.getMessagesByRoomCode(roomCode);
  messages.forEach(message => {
    ws.send(JSON.stringify({
      type: message.type || 'message',
      roomCode,
      userId: message.user_id,
      message: message.content,
      timestamp: message.timestamp
    }));
  });
}

// Handle leaving a room
async function handleLeave(ws, roomCode, userId) {
  if (!roomCode) return;
  
  // Remove the client from the room
  if (rooms.has(roomCode)) {
    const clients = rooms.get(roomCode);
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
async function handleMessage(ws, data) {
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
async function handleCreateRoom(ws, data) {
  const { userId, roomName, message: description } = data;
  
  if (!roomName) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room name is required'
    }));
    return;
  }
  
  // Generate a unique room code (6 random alphanumeric characters)
  const roomCode = nanoid(6);
  
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
  ws.roomCode = roomCode;
  ws.userId = userId;
  
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
  await handleJoin(ws, roomCode, userId);
}

// Broadcast a message to all clients in a room
function broadcastToRoom(roomCode, message) {
  if (!rooms.has(roomCode)) return;
  
  const clients = rooms.get(roomCode);
  const messageStr = JSON.stringify(message);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// For any other route, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;