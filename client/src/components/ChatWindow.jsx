import { useEffect, useState } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import styles from "./ChatWindow.module.css";

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

  const currentUserId =
    currentUser?._id?.toString() || currentUser?.id?.toString();

  const otherUser = conversation?.participants?.find(
    (user) => user._id?.toString() !== currentUserId,
  );

  const conversationId = conversation?._id?.toString();
  const otherUserId = otherUser?._id?.toString();

  useEffect(() => {
    if (!conversationId || !otherUserId || !connected) {
      return;
    }

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
    if (!lastMessage || !otherUserId) {
      return;
    }

    if (
      lastMessage.type !== "presence.online" &&
      lastMessage.type !== "presence.offline"
    ) {
      return;
    }

    const userId = lastMessage.payload?.userId?.toString();

    if (userId !== otherUserId) {
      return;
    }

    if (lastMessage.type === "presence.online") {
      setOtherUserOnline(true);
    }

    if (lastMessage.type === "presence.offline") {
      setOtherUserOnline(false);
    }
  }, [lastMessage, otherUserId]);

  useEffect(() => {
    if (!conversation || !currentUser || !otherUser || !lastMessage) {
      return;
    }

    const userId = lastMessage.payload?.userId;

    if (userId?.toString() !== otherUser._id?.toString()) {
      return;
    }

    if (lastMessage.type === "typing.start") {
      setOtherUserTyping(true);
    }

    if (lastMessage.type === "typing.stop") {
      setOtherUserTyping(false);
    }
  }, [lastMessage, conversation, currentUser, otherUser]);

  function updateMessageStatus(messageId, updates) {
    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        const currentMessageId =
          message.id?.toString() || message._id?.toString();

        if (currentMessageId !== messageId?.toString()) {
          return message;
        }

        return {
          ...message,
          ...updates,
        };
      }),
    );
  }

  useEffect(() => {
    if (!lastMessage || !conversationId) {
      return;
    }

    if (lastMessage.type === "message.new") {
      const message = lastMessage.payload;

      if (!message) {
        return;
      }

      if (message.conversationId?.toString() !== conversationId) {
        return;
      }

      setMessages((previousMessages) => {
        const messageId = message.id?.toString();

        const alreadyExists = previousMessages.some(
          (existingMessage) =>
            existingMessage.id?.toString() === messageId ||
            existingMessage._id?.toString() === messageId,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [
          ...previousMessages,
          {
            ...message,
            status: "delivered",
          },
        ];
      });

      sendMessageRead(message.id);

      return;
    }

    if (lastMessage.type === "message.ack") {
      const ack = lastMessage.payload;

      if (!ack) {
        return;
      }

      if (ack.conversationId?.toString() !== conversationId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.clientMessageId?.toString() ===
          ack.clientMessageId?.toString()
            ? {
                ...message,
                id: ack.messageId,
                status: "sent",
                createdAt: ack.createdAt,
              }
            : message,
        ),
      );

      return;
    }

    if (lastMessage.type === "message.error") {
      const { clientMessageId } = lastMessage.payload || {};

      if (!clientMessageId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.clientMessageId?.toString() === clientMessageId.toString()
            ? {
                ...message,
                status: "failed",
              }
            : message,
        ),
      );

      return;
    }

    if (lastMessage.type === "message.delivered") {
      const { messageId, deliveredAt } = lastMessage.payload || {};

      if (!messageId) {
        return;
      }

      updateMessageStatus(messageId, {
        status: "delivered",
        deliveredAt,
      });

      return;
    }

    if (lastMessage.type === "message.read") {
      const { messageId, readAt } = lastMessage.payload || {};

      if (!messageId) {
        return;
      }

      updateMessageStatus(messageId, {
        readAt,
      });

      return;
    }

    if (lastMessage.type === "conversation.read") {
      const { conversationId: readConversationId, readAt } =
        lastMessage.payload;

      if (readConversationId?.toString() !== conversationId?.toString()) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.senderId?.toString() === currentUserId?.toString()
            ? {
                ...message,
                readAt,
              }
            : message,
        ),
      );

      return;
    }

    if (lastMessage.type === "message.deleted") {
      const { messageId, deletedAt } = lastMessage.payload || {};

      if (!messageId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          const currentMessageId =
            message.id?.toString() ||
            message._id?.toString() ||
            message.clientMessageId;

          if (currentMessageId !== messageId.toString()) {
            return message;
          }

          return {
            ...message,
            deletedAt,
          };
        }),
      );

      return;
    }
  }, [lastMessage, conversationId, sendMessageRead]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function fetchMessages() {
      try {
        setLoading(true);

        const response = await fetch(
          `http://localhost:3000/api/conversations/${conversationId}/messages`,
          {
            credentials: "include",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        if (cancelled) {
          return;
        }

        const fetchedMessages = data.messages.map((message) => ({
          ...message,

          status: message.readAt
            ? "read"
            : message.deliveredAt
              ? "delivered"
              : "sent",
        }));

        setMessages(fetchedMessages);

        // Mark unread received messages as read.
        sendConversationRead(conversationId);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId, sendConversationRead]);

  function handleSend(text) {
    if (!conversationId || !currentUserId || !otherUserId) {
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

    setMessages((previousMessages) => [...previousMessages, optimisticMessage]);

    sendMessage(otherUserId, text, clientMessageId);
  }

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
          {otherUser?.username?.charAt(0).toUpperCase()}
        </div>

        <div className={styles.userInfo}>
          <h2>{otherUser?.username}</h2>

          {otherUserTyping ? (
            <span>Typing...</span>
          ) : otherUserOnline ? (
            <span>Online</span>
          ) : (
            <span>Offline</span>
          )}
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
