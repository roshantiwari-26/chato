import { useEffect, useRef, useState, useCallback } from "react";

function useWebSocket(activeConversationId) {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const activeConversationIdRef = useRef(
    activeConversationId?.toString() || null,
  );

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId?.toString() || null;
  }, [activeConversationId]);

  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      return;
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(import.meta.env.VITE_WS_URL);

    socketRef.current = socket;

    socket.onopen = () => {
      if (socketRef.current !== socket) {
        return;
      }

      setConnected(true);
    };

    socket.onmessage = (event) => {
      if (socketRef.current !== socket) {
        return;
      }

      let data;

      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("❌ Invalid WebSocket message:", error);
        return;
      }

      if (data.type === "message.new") {
        const messageId = data.payload?.id;
        const conversationId = data.payload?.conversationId?.toString();

        if (messageId && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "message.delivered",
              payload: {
                messageId,
              },
            }),
          );
        }

        if (
          conversationId &&
          conversationId !== activeConversationIdRef.current
        ) {
          setUnreadCounts((previous) => ({
            ...previous,
            [conversationId]: (previous[conversationId] || 0) + 1,
          }));
        }
      }

      if (data.type === "conversation.unread") {
        const counts = {};

        if (Array.isArray(data.payload?.counts)) {
          data.payload.counts.forEach((item) => {
            if (item?._id != null) {
              counts[item._id.toString()] = item.count;
            }
          });
        }

        setUnreadCounts(counts);
      }

      setLastMessage(data);
    };

    socket.onerror = (error) => {
      if (socketRef.current !== socket) {
        return;
      }

      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      if (socketRef.current !== socket) {
        return;
      }

      socketRef.current = null;
      setConnected(false);

      if (!shouldReconnectRef.current) {
        return;
      }

      clearTimeout(reconnectTimerRef.current);

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, 2000);
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;

      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket) {
        socket.close();
      }

      setConnected(false);
    };
  }, [connect]);

  const send = useCallback((message) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const sendMessage = useCallback(
    (receiverId, text, clientMessageId, replyTo, type, imageUrl, assetId) => {
      return send({
        type: "message.send",
        payload: {
          receiverId,
          text,
          clientMessageId,
          replyTo,
          type,
          imageUrl,
          assetId,
        },
      });
    },

    [send],
  );

  const subscribeToPresence = useCallback(
    (userId) => {
      return send({
        type: "presence.subscribe",
        payload: {
          userId,
        },
      });
    },
    [send],
  );

  const unsubscribePresence = useCallback(
    (userId) => {
      return send({
        type: "presence.unsubscribe",
        payload: {
          userId,
        },
      });
    },
    [send],
  );

  const sendTypingStart = useCallback(
    (receiverId) => {
      return send({
        type: "typing.start",
        payload: {
          receiverId,
        },
      });
    },
    [send],
  );

  const sendTypingStop = useCallback(
    (receiverId) => {
      return send({
        type: "typing.stop",
        payload: {
          receiverId,
        },
      });
    },
    [send],
  );

  const sendMessageRead = useCallback(
    (messageId) => {
      return send({
        type: "message.read",
        payload: {
          messageId,
        },
      });
    },
    [send],
  );

  const sendConversationRead = useCallback(
    (conversationId) => {
      return send({
        type: "conversation.read",
        payload: {
          conversationId,
        },
      });
    },
    [send],
  );

  const markConversationUnreadAsRead = useCallback((conversationId) => {
    setUnreadCounts((previous) => ({
      ...previous,
      [conversationId]: 0,
    }));
  }, []);

  const sendMessageDelete = useCallback(
    (messageId) => {
      return send({
        type: "message.delete",
        payload: {
          messageId,
        },
      });
    },
    [send],
  );

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
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  };
}

export default useWebSocket;
