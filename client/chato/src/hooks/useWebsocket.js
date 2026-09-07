import { useEffect, useRef, useState, useCallback } from "react";

function useWebSocket() {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      socketRef.current?.close();
      socketRef.current = null;
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  function connect() {
    const socket = new WebSocket(import.meta.env.VITE_WS_URL);

    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setLastMessage(data);

      if (data.type === "conversation.unread") {
        const counts = {};

        data.payload.counts.forEach((item) => {
          counts[item._id.toString()] = item.count;
        });

        setUnreadCounts(counts);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      setConnected(false);

      if (!shouldReconnectRef.current) {
        return;
      }

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };
  }

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

  const sendMessageDelivered = useCallback((messageId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message.delivered",
        payload: {
          messageId,
        },
      }),
    );
  }, []);

  const sendMessageRead = useCallback((messageId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message.read",
        payload: {
          messageId,
        },
      }),
    );
  }, []);

  const sendConversationRead = useCallback((conversationId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "conversation.read",
        payload: {
          conversationId,
        },
      }),
    );
  }, []);

  const markConversationUnreadAsRead = useCallback((conversationId) => {
    setUnreadCounts((previous) => ({
      ...previous,
      [conversationId]: 0,
    }));
  }, []);

  const sendMessageDelete = useCallback((messageId) => {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message.delete",
        payload: {
          messageId,
        },
      }),
    );
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    unreadCounts,
    markConversationUnreadAsRead,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
    sendMessageDelivered,
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  };
}

export default useWebSocket;
