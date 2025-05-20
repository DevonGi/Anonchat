import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp"),
  type: text("type").default("message"),
});

export const roomUsers = pgTable("room_users", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: text("user_id").notNull(),
  joined: text("joined"),
});

// Schemas for insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  code: true,
  description: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  roomId: true,
  userId: true,
  content: true,
  type: true,
});

export const insertRoomUserSchema = createInsertSchema(roomUsers).pick({
  roomId: true,
  userId: true,
});

// Types for frontend and backend
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect & {
  userCount?: number;
};

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertRoomUser = z.infer<typeof insertRoomUserSchema>;
export type RoomUser = typeof roomUsers.$inferSelect;

// WebSocket message types
export type ChatEvent = {
  type: "join" | "leave" | "message" | "create_room" | "error";
  room?: string;
  userId?: string;
  message?: string;
  timestamp?: string;
  roomId?: number;
  roomCode?: string;
  roomName?: string;
  userCount?: number;
  error?: string;
};
