import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from 'react';
import useStreamsStore from './store/streams';
import { notifications } from '@mantine/notifications';

export const WebsocketContext = createContext(false, null, () => {});

export const WebsocketProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [val, setVal] = useState(null);

  const { fetchStreams } = useStreamsStore();

  const ws = useRef(null);

  useEffect(() => {
    let wsUrl = `${window.location.host}/ws/`;
    if (import.meta.env.DEV) {
      wsUrl = `${window.location.hostname}:8001/ws/`;
    }

    if (window.location.protocol.match(/https/)) {
      wsUrl = `wss://${wsUrl}`;
    } else {
      wsUrl = `ws://${wsUrl}`;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('websocket connected');
      setIsReady(true);
    };

    // Reconnection logic
    socket.onclose = () => {
      setIsReady(false);
      setTimeout(() => {
        const reconnectWs = new WebSocket(wsUrl);
        reconnectWs.onopen = () => setIsReady(true);
      }, 3000); // Attempt to reconnect every 3 seconds
    };

    socket.onmessage = async (event) => {
      event = JSON.parse(event.data);
      switch (event.type) {
        case 'm3u_refresh':
          if (event.message?.success) {
            fetchStreams();
            notifications.show({
              message: event.message.message,
              color: 'green.5',
            });
          }
          break;

        default:
          console.error(`Unknown websocket event type: ${event.type}`);
          break;
      }
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  const ret = [isReady, val, ws.current?.send.bind(ws.current)];

  return (
    <WebsocketContext.Provider value={ret}>
      {children}
    </WebsocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const socket = useContext(WebsocketContext);
  return socket;
};
