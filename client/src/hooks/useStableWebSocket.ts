import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
}

interface UseStableWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export function useStableWebSocket(options: UseStableWebSocketOptions = {}) {
  const {
    onMessage,
    reconnectDelay = 3000,
    maxReconnectAttempts = 3
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = () => {
    if (!mountedRef.current) return;
    
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (!mountedRef.current) return;
        
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to default channels
        const defaultChannels = ['metrics', 'agents', 'tasks', 'logs'];
        defaultChannels.forEach(channel => {
          subscribe(channel);
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        if (!mountedRef.current) return;
        
        setIsConnected(false);
        
        // Only attempt reconnection if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectDelay);
        } else {
          setConnectionError('Connection failed after multiple attempts');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (mountedRef.current) {
          setConnectionError('WebSocket connection error');
        }
      };

    } catch (error) {
      if (mountedRef.current) {
        setConnectionError('Failed to create WebSocket connection');
        console.error('WebSocket connection error:', error);
      }
    }
  };

  const disconnect = () => {
    mountedRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const subscribe = (channel: string) => {
    subscriptionsRef.current.add(channel);
    
    if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'subscribe',
        channel,
        data: {}
      });
    }
  };

  const unsubscribe = (channel: string) => {
    subscriptionsRef.current.delete(channel);
    
    if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'unsubscribe',
        channel,
        data: {}
      });
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Connect after a short delay to avoid rapid reconnections
    const connectTimeout = setTimeout(connect, 100);
    
    return () => {
      clearTimeout(connectTimeout);
      disconnect();
    };
  }, []); // Only run once on mount

  return {
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current
  };
}