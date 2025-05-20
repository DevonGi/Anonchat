import { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { useRooms } from "@/hooks/use-rooms";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Room } from "@shared/schema";
import RoomItem from "./room-item";

interface SidebarProps {
  show: boolean;
  onCreateRoom: () => void;
  onRoomSelect: (room: Room) => void;
  selectedRoom: Room | null;
}

export default function Sidebar({ show, onCreateRoom, onRoomSelect, selectedRoom }: SidebarProps) {
  const [roomCode, setRoomCode] = useState("");
  const { userId, regenerateUserId } = useChat();
  const { rooms, joinRoom } = useRooms();
  const { sendMessage } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    
    sendMessage(JSON.stringify({
      type: "join",
      room: roomCode.trim(),
      userId: userId
    }));
    
    setRoomCode("");
  };

  return (
    <div 
      className={`${show ? 'block' : 'hidden'} md:block w-full md:w-80 md:min-w-[320px] bg-white dark:bg-dark-500 border-r border-gray-200 dark:border-dark-300 flex flex-col transition-all duration-300 z-10 md:relative absolute h-full`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-primary-600 dark:text-primary-400 h-5 w-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Anonymous Chat
          </h1>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-100 h-5 w-5"
            >
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-800 h-5 w-5"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </Button>
      </div>
      
      <div className="p-4">
        <Button 
          onClick={onCreateRoom}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-5 w-5"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create New Room</span>
        </Button>
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-dark-300">
        <div className="flex gap-2">
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
            className="flex-1 dark:bg-dark-400 dark:text-gray-200"
          />
          <Button 
            onClick={handleJoinRoom}
            className="bg-secondary-500 hover:bg-secondary-600 text-white"
          >
            Join
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Your Rooms
          </h2>
          
          {rooms.length === 0 ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
              No rooms joined yet. Create or join a room to start chatting.
            </div>
          ) : (
            rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onClick={() => onRoomSelect(room)}
              />
            ))
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              Anonymous User
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID: <span className="font-mono">{userId}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={regenerateUserId}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Regenerate user ID"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-5 w-5"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
