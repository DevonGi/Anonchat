import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Room } from '@shared/schema';
import { useWebSocket } from './use-websocket';
import { nanoid } from 'nanoid';

interface RoomsContextType {
  rooms: Room[];
  addRoom: (room: Room) => void;
  removeRoom: (roomId: number) => void;
  joinRoom: (roomCode: string, userId: string) => void;
  leaveRoom: (roomCode: string, userId: string) => void;
  updateRoomUserCount: (roomCode: string, userCount: number) => void;
}

const RoomsContext = createContext<RoomsContextType | undefined>(undefined);

export const RoomsProvider = ({ children }: { children: ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const { sendMessage } = useWebSocket();

  const addRoom = useCallback((room: Room) => {
    setRooms((prevRooms) => {
      // Check if room already exists
      const exists = prevRooms.some((r) => r.code === room.code);
      if (exists) {
        return prevRooms;
      }
      
      // Add room with userCount if not provided
      const newRoom = { 
        ...room, 
        userCount: room.userCount || 1 
      };
      
      return [...prevRooms, newRoom];
    });
  }, []);

  const removeRoom = useCallback((roomId: number) => {
    setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
  }, []);

  const joinRoom = useCallback((roomCode: string, userId: string) => {
    if (!roomCode || !userId) return;
    
    sendMessage(JSON.stringify({
      type: 'join',
      room: roomCode,
      userId,
    }));
  }, [sendMessage]);

  const leaveRoom = useCallback((roomCode: string, userId: string) => {
    if (!roomCode || !userId) return;
    
    sendMessage(JSON.stringify({
      type: 'leave',
      room: roomCode,
      userId,
    }));
    
    setRooms((prevRooms) => prevRooms.filter((room) => room.code !== roomCode));
  }, [sendMessage]);

  const updateRoomUserCount = useCallback((roomCode: string, userCount: number) => {
    setRooms((prevRooms) => 
      prevRooms.map((room) => 
        room.code === roomCode 
          ? { ...room, userCount } 
          : room
      )
    );
  }, []);

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        addRoom,
        removeRoom,
        joinRoom,
        leaveRoom,
        updateRoomUserCount,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomsContext);
  if (context === undefined) {
    throw new Error('useRooms must be used within a RoomsProvider');
  }
  return context;
};
