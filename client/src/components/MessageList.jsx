import { useRef, useEffect, memo, useCallback } from "react";
import styles from "./ChatWindow.module.css";

const getMessageId = (message) =>
  message.id?.toString() ||
  message._id?.toString() ||
  message.clientMessageId?.toString();

const MessageItem = memo(({ message, isMine, onDelete }) => {
  const isDeleted = Boolean(message.deletedAt);

  const messageId = getMessageId(message);

  const handleDelete = useCallback(() => {
    onDelete(messageId);
  }, [messageId, onDelete]);

  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`${styles.messageRow} ${
        isMine ? styles.messageRowMine : styles.messageRowOther
      }`}
    >
      <div
        className={`${styles.messageBubble} ${
          isMine ? styles.messageBubbleMine : styles.messageBubbleOther
        }`}
      >
        {isDeleted ? (
          <p className={styles.deletedMessage}>This message was deleted</p>
        ) : (
          <p>{message.text}</p>
        )}

        <div className={styles.messageMeta}>
          {isMine && !isDeleted && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
              aria-label="Delete message"
              title="Delete message"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM6 9h2v9H6V9Zm-1 0h14l-1 11H6L5 9Z" />
              </svg>
            </button>
          )}

          {formattedTime && (
            <span className={styles.messageTime}>{formattedTime}</span>
          )}

          {isMine && (
            <span
              className={`${styles.messageStatus} ${
                message.readAt ? styles.readStatus : ""
              }`}
            >
              {message.status === "sending"
                ? "Sending..."
                : message.status === "failed"
                  ? "Failed"
                  : message.readAt
                    ? "✔✔"
                    : message.deliveredAt
                      ? "✓✓"
                      : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";

function MessageList({ messages = [], currentUserId, sendMessageDelete }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <article className={styles.messagesArticle}>
      {messages.map((message) => {
        const senderId = message.senderId?.toString();
        const isMine = senderId === currentUserId?.toString();
        const stableKey = message.clientMessageId || getMessageId(message);

        return (
          <MessageItem
            key={stableKey}
            message={message}
            isMine={isMine}
            onDelete={sendMessageDelete}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </article>
  );
}

export default memo(MessageList);
