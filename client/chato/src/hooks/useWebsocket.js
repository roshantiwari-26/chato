import { useEffect, useRef, useState, useCallback } from "react";

function useWebSocket() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000");

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("🟢 WebSocket connected");
      setConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("🔴 WebSocket disconnected");
      setConnected(false);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  function sendMessage(receiverId, text, clientMessageId) {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected");
      return;
    }

    const payload = {
      type: "message.send",
      payload: {
        receiverId,
        text,
        clientMessageId,
      },
    };

    socketRef.current.send(JSON.stringify(payload));
  }

  const subscribeToPresence = useCallback((userId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "presence.subscribe",
        payload: {
          userId,
        },
      }),
    );
  }, []);

  const unsubscribePresence = useCallback((userId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "presence.unsubscribe",
        payload: {
          userId,
        },
      }),
    );
  }, []);

  const sendTypingStart = useCallback((receiverId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "typing.start",
        payload: {
          receiverId,
        },
      }),
    );
  }, []);

  const sendTypingStop = useCallback((receiverId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "typing.stop",
        payload: {
          receiverId,
        },
      }),
    );
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
  };
}

export default useWebSocket;
