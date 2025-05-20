import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nanoid } from "nanoid";

// Simple chat app component
function ChatApp() {
  const [userId] = useState(() => {
    const savedId = localStorage.getItem('anonymousChatUserId');
    const newId = savedId || `user_${nanoid(6)}`;
    if (!savedId) {
      localStorage.setItem('anonymousChatUserId', newId);
    }
    return newId;
  });
  
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [newMessage, setNewMessage] = useState('');
  
  // Connect to WebSocket
  useEffect(() => {
    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setSocket(ws);
          setConnected(true);
        };
        
        ws.onmessage = (event) => {
          console.log('Message received:', event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message' || data.type === 'join' || data.type === 'leave') {
              setMessages(prev => [...prev, data]);
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnected(false);
          setSocket(null);
          // Try to reconnect after 2 seconds
          setTimeout(connectWs, 2000);
        };
        
        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
        };
        
        return ws;
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        return null;
      }
    };
    
    const ws = connectWs();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);
  
  // Join a room
  const joinRoom = () => {
    if (!socket || !roomCode.trim()) return;
    
    socket.send(JSON.stringify({
      type: 'join',
      room: roomCode.trim(),
      userId
    }));
    
    setCurrentRoom(roomCode.trim());
    setRoomCode('');
  };
  
  // Create a room
  const createRoom = () => {
    if (!socket) return;
    
    const newRoomCode = nanoid(6);
    socket.send(JSON.stringify({
      type: 'create_room',
      userId,
      roomName: `Room ${newRoomCode}`,
      message: 'A new anonymous chat room'
    }));
    
    setCurrentRoom(newRoomCode);
  };
  
  // Send a message
  const sendMessage = () => {
    if (!socket || !currentRoom || !newMessage.trim()) return;
    
    socket.send(JSON.stringify({
      type: 'message',
      room: currentRoom,
      userId,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    }));
    
    setNewMessage('');
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Anonymous Chat</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">Your ID: {userId}</div>
        
        {!currentRoom ? (
          <div className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Join a Room</h2>
              <div className="flex gap-2">
                <Input 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Enter room code"
                  className="flex-1"
                />
                <Button onClick={joinRoom} disabled={!connected}>Join</Button>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Create a Room</h2>
              <Button onClick={createRoom} disabled={!connected}>Create New Room</Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">Current Room: </span>
                <span className="font-mono text-sm">{currentRoom}</span>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (socket) {
                    socket.send(JSON.stringify({
                      type: 'leave',
                      room: currentRoom,
                      userId
                    }));
                  }
                  setCurrentRoom('');
                  setMessages([]);
                }}
              >
                Leave Room
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {currentRoom && (
        <>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded-lg ${
                      msg.type === 'join' || msg.type === 'leave'
                        ? 'bg-gray-200 dark:bg-gray-700 text-center'
                        : msg.userId === userId
                        ? 'bg-blue-500 text-white ml-auto max-w-[80%]'
                        : 'bg-gray-300 dark:bg-gray-600 mr-auto max-w-[80%]'
                    }`}
                  >
                    {msg.type === 'join' || msg.type === 'leave' ? (
                      <p>{msg.message || `User ${msg.userId} ${msg.type === 'join' ? 'joined' : 'left'} the room`}</p>
                    ) : (
                      <>
                        <p className="text-xs opacity-70">{msg.userId}</p>
                        <p>{msg.message}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex gap-2">
              <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={!connected}>Send</Button>
            </div>
          </div>
        </>
      )}
      
      {!connected && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full animate-pulse">
          Disconnected - Reconnecting...
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ChatApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
