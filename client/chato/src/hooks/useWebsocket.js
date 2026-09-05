import { useEffect, useRef, useState, useCallback } from "react";

function useWebSocket() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

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
  };
}

export default useWebSocket;
