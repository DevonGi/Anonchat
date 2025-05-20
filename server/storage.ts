import { 
  users, 
  rooms, 
  messages, 
  roomUsers,
  type User, 
  type InsertUser,
  type Room,
  type InsertRoom,
  type Message,
  type InsertMessage,
  type RoomUser,
  type InsertRoomUser
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room operations
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  
  // Message operations
  getMessages(roomId: number): Promise<Message[]>;
  getMessagesByRoomCode(roomCode: string): Promise<Message[]>;
  createMessage(message: InsertMessage, roomCode: string): Promise<Message>;
  
  // RoomUser operations
  getUsersInRoom(roomId: number): Promise<string[]>;
  getUsersInRoomByCode(roomCode: string): Promise<string[]>;
  addUserToRoom(roomCode: string, userId: string): Promise<void>;
  removeUserFromRoom(roomCode: string, userId: string): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private roomsMap: Map<number, Room>;
  private messagesMap: Map<number, Message>;
  private roomUsersMap: Map<number, RoomUser>;
  
  private userIdCounter: number;
  private roomIdCounter: number;
  private messageIdCounter: number;
  private roomUserIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.roomsMap = new Map();
    this.messagesMap = new Map();
    this.roomUsersMap = new Map();
    
    this.userIdCounter = 1;
    this.roomIdCounter = 1;
    this.messageIdCounter = 1;
    this.roomUserIdCounter = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Room operations
  async getRooms(): Promise<Room[]> {
    return Array.from(this.roomsMap.values());
  }
  
  async getRoom(id: number): Promise<Room | undefined> {
    return this.roomsMap.get(id);
  }
  
  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.roomsMap.values()).find(
      (room) => room.code === code
    );
  }
  
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const room: Room = {
      ...insertRoom,
      id,
      createdAt: new Date().toISOString(),
      description: insertRoom.description || null
    };
    this.roomsMap.set(id, room);
    return room;
  }
  
  // Message operations
  async getMessages(roomId: number): Promise<Message[]> {
    return Array.from(this.messagesMap.values()).filter(
      (message) => message.roomId === roomId
    );
  }
  
  async getMessagesByRoomCode(roomCode: string): Promise<Message[]> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return [];
    
    return Array.from(this.messagesMap.values()).filter(
      (message) => message.roomId === room.id
    );
  }
  
  async createMessage(insertMessage: InsertMessage, roomCode: string): Promise<Message> {
    // Find the room or create it if it doesn't exist
    let room = await this.getRoomByCode(roomCode);
    
    if (!room) {
      // Create the room automatically if it doesn't exist
      room = await this.createRoom({
        name: `Room ${roomCode}`,
        code: roomCode,
        description: 'Auto-created room'
      });
    }
    
    const id = this.messageIdCounter++;
    const message: Message = {
      ...insertMessage,
      id,
      roomId: room.id,
      timestamp: new Date().toISOString(),
      type: insertMessage.type || 'message'
    };
    this.messagesMap.set(id, message);
    return message;
  }
  
  // RoomUser operations
  async getUsersInRoom(roomId: number): Promise<string[]> {
    return Array.from(this.roomUsersMap.values())
      .filter((roomUser) => roomUser.roomId === roomId)
      .map((roomUser) => roomUser.userId);
  }
  
  async getUsersInRoomByCode(roomCode: string): Promise<string[]> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return [];
    
    return Array.from(this.roomUsersMap.values())
      .filter((roomUser) => roomUser.roomId === room.id)
      .map((roomUser) => roomUser.userId);
  }
  
  async addUserToRoom(roomCode: string, userId: string): Promise<void> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) throw new Error(`Room with code ${roomCode} not found`);
    
    // Check if user is already in the room
    const existingUsers = await this.getUsersInRoom(room.id);
    if (existingUsers.includes(userId)) return;
    
    const id = this.roomUserIdCounter++;
    const roomUser: RoomUser = {
      id,
      roomId: room.id,
      userId,
      joined: new Date().toISOString()
    };
    this.roomUsersMap.set(id, roomUser);
  }
  
  async removeUserFromRoom(roomCode: string, userId: string): Promise<void> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return;
    
    // Find and remove the room user entry
    const roomUserEntries = Array.from(this.roomUsersMap.entries());
    for (const [id, roomUser] of roomUserEntries) {
      if (roomUser.roomId === room.id && roomUser.userId === userId) {
        this.roomUsersMap.delete(id);
        break;
      }
    }
  }
}

// Export singleton instance
export const storage = new MemStorage();
