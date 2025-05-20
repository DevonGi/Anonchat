import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Room, ChatEvent } from '@shared/schema';
import { nanoid } from 'nanoid';

interface ChatContextType {
  userId: string;
  messages: ChatEvent[];
  activeRoom: Room | null;
  setActiveRoom: (room: Room | null) => void;
  addMessage: (message: ChatEvent) => void;
  clearMessages: () => void;
  generateUserId: () => void;
  regenerateUserId: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string>(() => {
    // Check if userId already exists in localStorage
    const savedUserId = localStorage.getItem('anonymousChatUserId');
    return savedUserId || '';
  });
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const generateUserId = useCallback(() => {
    // Generate a user ID if it doesn't exist
    if (!userId) {
      const newUserId = `u_${nanoid(8)}`;
      setUserId(newUserId);
      localStorage.setItem('anonymousChatUserId', newUserId);
    }
  }, [userId]);

  const regenerateUserId = useCallback(() => {
    const newUserId = `u_${nanoid(8)}`;
    setUserId(newUserId);
    localStorage.setItem('anonymousChatUserId', newUserId);
  }, []);

  const addMessage = useCallback((message: ChatEvent) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        userId,
        messages,
        activeRoom,
        setActiveRoom,
        addMessage,
        clearMessages,
        generateUserId,
        regenerateUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
