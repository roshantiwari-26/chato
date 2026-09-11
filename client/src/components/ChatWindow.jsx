import { useEffect, useState, useCallback, useRef } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import styles from "./ChatWindow.module.css";

const getNormalizedId = (entity) =>
  entity?.id?.toString() ||
  entity?._id?.toString() ||
  entity?.clientMessageId?.toString();

function ChatWindow({
  conversation,
  sendMessage,
  connected,
  lastMessage,
  currentUser,
  subscribeToPresence,
  unsubscribePresence,
  sendTypingStart,
  sendTypingStop,
  sendMessageRead,
  sendConversationRead,
  sendMessageDelete,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const currentUserId = getNormalizedId(currentUser);
  const conversationId = getNormalizedId(conversation);

  const otherUser = conversation?.participants?.find(
    (user) => getNormalizedId(user) !== currentUserId,
  );
  const otherUserId = getNormalizedId(otherUser);

  useEffect(() => {
    setOtherUserTyping(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !otherUserId || !connected) return;

    setOtherUserOnline(false);
    subscribeToPresence(otherUserId);

    return () => {
      unsubscribePresence(otherUserId);
    };
  }, [
    conversationId,
    otherUserId,
    connected,
    subscribeToPresence,
    unsubscribePresence,
  ]);

  useEffect(() => {
    if (!lastMessage || !otherUserId) return;

    const { type, payload } = lastMessage;
    if (type !== "presence.online" && type !== "presence.offline") return;

    const targetUserId = payload?.userId?.toString();
    if (targetUserId !== otherUserId) return;

    setOtherUserOnline(type === "presence.online");
  }, [lastMessage, otherUserId]);

  useEffect(() => {
    if (!conversationId || !otherUserId || !lastMessage) return;

    const { type, payload } = lastMessage;
    const typingUserId = payload?.userId?.toString();

    if (typingUserId !== otherUserId) return;

    if (type === "typing.start") setOtherUserTyping(true);
    if (type === "typing.stop") setOtherUserTyping(false);
  }, [lastMessage, conversationId, otherUserId]);

  const updateSingleMessage = useCallback((messageId, updates) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        const idMatches =
          getNormalizedId(msg) === messageId?.toString() ||
          msg.clientMessageId?.toString() === messageId?.toString();

        return idMatches ? { ...msg, ...updates } : msg;
      }),
    );
  }, []);

  useEffect(() => {
    if (!lastMessage || !conversationId) return;

    const { type, payload } = lastMessage;
    if (!payload) return;

    switch (type) {
      case "message.new": {
        if (payload.conversationId?.toString() !== conversationId) return;

        setMessages((prev) => {
          const incomingId = getNormalizedId(payload);
          const exists = prev.some(
            (msg) =>
              getNormalizedId(msg) === incomingId ||
              (msg.clientMessageId &&
                msg.clientMessageId === payload.clientMessageId),
          );

          if (exists) return prev;

          return [...prev, { ...payload, status: "delivered" }];
        });

        if (sendMessageRead && payload.id) {
          sendMessageRead(payload.id);
        }
        break;
      }

      case "message.ack": {
        if (payload.conversationId?.toString() !== conversationId) return;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.clientMessageId?.toString() ===
            payload.clientMessageId?.toString()
              ? {
                  ...msg,
                  id: payload.messageId,
                  status: "sent",
                  createdAt: payload.createdAt || msg.createdAt,
                }
              : msg,
          ),
        );
        break;
      }

      case "message.error": {
        if (payload.clientMessageId) {
          updateSingleMessage(payload.clientMessageId, { status: "failed" });
        }
        break;
      }

      case "message.delivered": {
        if (payload.messageId) {
          updateSingleMessage(payload.messageId, {
            status: "delivered",
            deliveredAt: payload.deliveredAt,
          });
        }
        break;
      }

      case "message.read": {
        if (payload.messageId) {
          updateSingleMessage(payload.messageId, {
            status: "read",
            readAt: payload.readAt,
          });
        }
        break;
      }

      case "conversation.read": {
        if (payload.conversationId?.toString() !== conversationId) return;

        setMessages((prev) =>
          prev.map((msg) =>
            getNormalizedId(msg.senderId) === currentUserId
              ? { ...msg, status: "read", readAt: payload.readAt }
              : msg,
          ),
        );
        break;
      }

      case "message.deleted": {
        if (payload.messageId) {
          updateSingleMessage(payload.messageId, {
            deletedAt: payload.deletedAt,
          });
        }
        break;
      }

      default:
        break;
    }
  }, [
    lastMessage,
    conversationId,
    currentUserId,
    sendMessageRead,
    updateSingleMessage,
  ]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isCancelled = false;

    async function fetchMessages() {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:3000/api/conversations/${conversationId}/messages`,
          { credentials: "include" },
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        if (isCancelled) return;

        const fetchedMessages = data.messages.map((msg) => ({
          ...msg,
          status: msg.readAt ? "read" : msg.deliveredAt ? "delivered" : "sent",
        }));

        setMessages(fetchedMessages);

        if (sendConversationRead) {
          sendConversationRead(conversationId);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch messages:", error);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, sendConversationRead]);

  const handleSend = useCallback(
    (text) => {
      if (!conversationId || !currentUserId || !otherUserId) return;

      const clientMessageId = crypto.randomUUID();

      const optimisticMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        text,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      sendMessage(otherUserId, text, clientMessageId);
    },
    [conversationId, currentUserId, otherUserId, sendMessage],
  );

  if (!conversation) {
    return (
      <section className={styles.emptyWindow}>
        <h2>Select a conversation</h2>
        <p>Choose a chat from the sidebar to start messaging.</p>
      </section>
    );
  }

  return (
    <section className={styles.chatWindow}>
      <header className={styles.chatHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="Back to conversations"
        >
          ←
        </button>
        <div className={styles.avatar}>
          {otherUser?.username?.charAt(0).toUpperCase() || "?"}
        </div>

        <div className={styles.userInfo}>
          <h2>{otherUser?.username || "Unknown User"}</h2>
          <span className={otherUserOnline ? styles.online : styles.offline}>
            {otherUserTyping
              ? "Typing..."
              : otherUserOnline
                ? "Online"
                : "Offline"}
          </span>
        </div>
      </header>

      <div className={styles.messagesContainer}>
        {loading && <p className={styles.loading}>Loading messages...</p>}

        {!loading && messages.length === 0 && (
          <p className={styles.emptyChat}>No messages yet.</p>
        )}

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          sendMessageDelete={sendMessageDelete}
        />
      </div>

      <MessageInput
        onSend={handleSend}
        connected={connected}
        receiverId={otherUserId}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
      />
    </section>
  );
}

export default ChatWindow;
