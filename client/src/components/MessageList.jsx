import { useEffect, useRef, memo, useCallback } from "react";
import styles from "./ChatWindow.module.css";

const getNormalizedId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  return (
    value._id?.toString() ||
    value.id?.toString() ||
    value.clientMessageId?.toString() ||
    null
  );
};

const MessageItem = memo(({ message, isMine, onDelete }) => {
  const isDeleted = Boolean(message.deletedAt);
  const messageId = getNormalizedId(message);

  const handleDelete = useCallback(() => {
    if (messageId) {
      onDelete(messageId);
    }
  }, [messageId, onDelete]);

  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  let statusText = "";
  let statusClass = "";

  if (isMine) {
    if (message.status === "sending") {
      statusText = "Sending...";
    } else if (message.status === "failed") {
      statusText = "Failed";
    } else if (message.readAt) {
      statusText = "✔✔";
      statusClass = styles.readStatus;
    } else if (message.deliveredAt) {
      statusText = "✓✓";
    } else {
      statusText = "✓";
    }
  }

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
          <p className={styles.deletedMessage}>This message was deleted </p>
        ) : (
          <p>{message.text}</p>
        )}
        ```
        <div className={styles.messageMeta}>
          {isMine && !isDeleted && messageId && (
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
            <span className={`${styles.messageStatus} ${statusClass}`}>
              {statusText}
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
  const previousMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;

    if (messages.length > previousCount) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }

    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <article className={styles.messagesArticle}>
      {messages.map((message) => {
        const senderId = getNormalizedId(message.senderId);
        const normalizedCurrentUserId = getNormalizedId(currentUserId);
        const isMine = senderId === normalizedCurrentUserId;

        const stableKey =
          getNormalizedId(message.clientMessageId) ||
          getNormalizedId(message._id) ||
          getNormalizedId(message.id);

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
