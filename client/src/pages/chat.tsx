import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useRooms } from "@/hooks/use-rooms";
import Sidebar from "@/components/sidebar";
import ChatHeader from "@/components/chat-header";
import ChatInput from "@/components/chat-input";
import ChatMessage from "@/components/chat-message";
import CreateRoomModal from "@/components/create-room-modal";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Chat() {
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const { userId, messages, activeRoom, setActiveRoom } = useChat();
  const { rooms } = useRooms();
  const { sendMessage } = useWebSocket();
  const [dateGroups, setDateGroups] = useState<{[key: string]: any[]}>({});

  // Group messages by date
  useEffect(() => {
    if (!activeRoom) return;
    
    const groups: {[key: string]: any[]} = {};
    
    messages
      .filter((m) => m.roomCode === activeRoom.code)
      .forEach((message) => {
        const date = new Date(message.timestamp || new Date());
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        
        groups[dateKey].push(message);
      });
    
    setDateGroups(groups);
  }, [messages, activeRoom]);

  const handleSend = (content: string) => {
    if (!activeRoom || !content.trim()) return;
    
    sendMessage(JSON.stringify({
      type: "message",
      room: activeRoom.code,
      userId: userId,
      message: content,
      timestamp: new Date().toISOString()
    }));
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const currentRoom = activeRoom || (rooms.length > 0 ? rooms[0] : null);

  return (
    <div className="h-screen flex flex-col md:flex-row">
      <Sidebar 
        show={showSidebar}
        onCreateRoom={() => setShowCreateRoomModal(true)}
        onRoomSelect={setActiveRoom}
        selectedRoom={currentRoom}
      />
      
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-dark-500">
        {currentRoom ? (
          <>
            <ChatHeader 
              room={currentRoom} 
              onToggleSidebar={toggleSidebar} 
            />
            
            <ScrollArea className="flex-1 p-4 md:p-6">
              {Object.entries(dateGroups).map(([dateKey, dateMessages]) => (
                <div key={dateKey}>
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-200 dark:bg-dark-400 px-3 py-1 rounded-full">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(dateMessages[0].timestamp || new Date()), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {dateMessages.map((message, i) => (
                      <ChatMessage 
                        key={`${dateKey}-${i}`}
                        message={message}
                        isCurrentUser={message.userId === userId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
            
            <Separator className="mt-auto" />
            
            <ChatInput onSend={handleSend} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <h2 className="text-2xl font-bold mb-2">Welcome to Anonymous Chat</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Join an existing room or create a new one to start chatting anonymously.
              </p>
              <button 
                className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md font-medium"
                onClick={() => setShowCreateRoomModal(true)}
              >
                Create Your First Room
              </button>
            </div>
          </div>
        )}
      </div>
      
      <CreateRoomModal 
        isOpen={showCreateRoomModal} 
        onClose={() => setShowCreateRoomModal(false)} 
      />
    </div>
  );
}
