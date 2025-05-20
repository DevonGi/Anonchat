import { useState, useEffect, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  status: WebSocketStatus;
  lastMessage: MessageEvent | null;
  sendMessage: (message: string) => void;
  reconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      setSocket(ws);
      setStatus('connecting');

      ws.onopen = () => {
        console.log('WebSocket connection open');
        setStatus('open');
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        setLastMessage(event);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setStatus('closed');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
      
      return ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setStatus('error');
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    },
    [socket]
  );

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    
    connectWebSocket();
  }, [socket, connectWebSocket]);

  useEffect(() => {
    const ws = connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  return { socket, status, lastMessage, sendMessage, reconnect };
};
