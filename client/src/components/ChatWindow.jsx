import { useEffect, useState, useCallback } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import { getMessages } from "../api/conversations";
import styles from "./ChatWindow.module.css";

const getNormalizedId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  return (
    value.id?.toString() ||
    value._id?.toString() ||
    value.clientMessageId?.toString() ||
    null
  );
};

const getMessageKey = (message) => {
  if (!message) {
    return null;
  }

  return (
    getNormalizedId(message._id) ||
    getNormalizedId(message.id) ||
    getNormalizedId(message.clientMessageId)
  );
};

const getMessageStatus = (message) => {
  if (message.readAt) {
    return "read";
  }

  if (message.deliveredAt) {
    return "delivered";
  }

  return "sent";
};

const mergeMessages = (existingMessages, incomingMessages) => {
  const messageMap = new Map();

  for (const message of existingMessages) {
    const key = getMessageKey(message);

    ```
if (key) {
  messageMap.set(key, message);
}
```;
  }

  for (const message of incomingMessages) {
    const key = getMessageKey(message);

    ```
if (!key) {
  continue;
}

const existingMessage = messageMap.get(key);

messageMap.set(
  key,
  existingMessage
    ? {
        ...existingMessage,
        ...message,
      }
    : message,
);
```;
  }

  return Array.from(messageMap.values()).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
};

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

  const updateSingleMessage = useCallback((messageId, updates) => {
    const normalizedMessageId = getNormalizedId(messageId);

    if (!normalizedMessageId) {
      return;
    }

    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        const matches =
          getNormalizedId(message._id) === normalizedMessageId ||
          getNormalizedId(message.id) === normalizedMessageId ||
          getNormalizedId(message.clientMessageId) === normalizedMessageId;

        return matches
          ? {
              ...message,
              ...updates,
            }
          : message;
      }),
    );
  }, []);

  useEffect(() => {
    setOtherUserTyping(false);
    setOtherUserOnline(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !otherUserId || !connected) {
      return;
    }

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
    if (!lastMessage || !otherUserId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (type !== "presence.online" && type !== "presence.offline") {
      return;
    }

    const targetUserId = getNormalizedId(payload?.userId);

    if (targetUserId !== otherUserId) {
      return;
    }

    setOtherUserOnline(type === "presence.online");
  }, [lastMessage, otherUserId]);

  useEffect(() => {
    if (!lastMessage || !conversationId || !otherUserId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (type !== "typing.start" && type !== "typing.stop") {
      return;
    }

    const typingUserId = getNormalizedId(payload?.userId);

    if (typingUserId !== otherUserId) {
      return;
    }

    setOtherUserTyping(type === "typing.start");
  }, [lastMessage, conversationId, otherUserId]);

  useEffect(() => {
    if (!lastMessage || !conversationId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (!payload) {
      return;
    }

    switch (type) {
      case "message.new": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        const incomingMessage = {
          ...payload,
          status: getMessageStatus(payload),
        };

        setMessages((previousMessages) =>
          mergeMessages(previousMessages, [incomingMessage]),
        );

        if (sendMessageRead && payload.id) {
          sendMessageRead(payload.id);
        }

        break;
      }

      case "message.ack": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        const clientMessageId = getNormalizedId(payload.clientMessageId);

        if (!clientMessageId) {
          return;
        }

        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            getNormalizedId(message.clientMessageId) === clientMessageId
              ? {
                  ...message,
                  id: payload.messageId,
                  conversationId:
                    payload.conversationId || message.conversationId,
                  status: "sent",
                  createdAt: payload.createdAt || message.createdAt,
                }
              : message,
          ),
        );

        break;
      }

      case "message.error": {
        const clientMessageId = getNormalizedId(payload.clientMessageId);

        if (!clientMessageId) {
          return;
        }

        updateSingleMessage(clientMessageId, {
          status: "failed",
        });

        break;
      }

      case "message.delivered": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          status: "delivered",
          deliveredAt: payload.deliveredAt,
        });

        break;
      }

      case "message.read": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          status: "read",
          readAt: payload.readAt,
        });

        break;
      }

      case "conversation.read": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        setMessages((previousMessages) =>
          previousMessages.map((message) => {
            if (getNormalizedId(message.senderId) !== currentUserId) {
              return message;
            }

            return {
              ...message,
              status: "read",
              readAt: payload.readAt,
            };
          }),
        );

        break;
      }

      case "message.deleted": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          deletedAt: payload.deletedAt,
        });

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
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function fetchMessages() {
      try {
        setLoading(true);
        setMessages([]);

        const data = await getMessages(conversationId);

        if (isCancelled) {
          return;
        }

        const fetchedMessages = (data.messages || []).map((message) => ({
          ...message,
          status: getMessageStatus(message),
        }));

        setMessages((previousMessages) =>
          mergeMessages(previousMessages, fetchedMessages),
        );

        if (sendConversationRead) {
          sendConversationRead(conversationId);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch messages:", error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, sendConversationRead]);

  const handleSend = useCallback(
    (text) => {
      if (!conversationId || !currentUserId || !otherUserId || !connected) {
        return;
      }

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

      setMessages((previousMessages) =>
        mergeMessages(previousMessages, [optimisticMessage]),
      );

      const sent = sendMessage(otherUserId, text, clientMessageId);

      if (sent === false) {
        updateSingleMessage(clientMessageId, {
          status: "failed",
        });
      }
    },
    [
      conversationId,
      currentUserId,
      otherUserId,
      connected,
      sendMessage,
      updateSingleMessage,
    ],
  );

  if (!conversation) {
    return (
      <section className={styles.emptyWindow}>
        {" "}
        <h2>Select a conversation</h2>{" "}
        <p>Choose a chat from the sidebar to start messaging.</p>{" "}
      </section>
    );
  }

  return (
    <section className={styles.chatWindow}>
      {" "}
      <header className={styles.chatHeader}>
        {" "}
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="Back to conversations"
        >
          ←{" "}
        </button>
        ```
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
