import { useRef, useEffect, memo } from "react";

import styles from "./ChatWindow.module.css";

function MessageList({ messages, currentUserId, sendMessageDelete }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <article>
      {messages.map((message) => {
        const senderId = message.senderId?.toString();

        const isMine = senderId === currentUserId;
        const isDeleted = Boolean(message.deletedAt);

        const messageKey =
          message.id?.toString() ||
          message._id?.toString() ||
          message.clientMessageId;

        return (
          <div
            key={messageKey}
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
                <p className={styles.deletedMessage}>
                  This message was deleted
                </p>
              ) : (
                <p>{message.text}</p>
              )}

              <div className={styles.messageMeta}>
                {isMine && !isDeleted && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => sendMessageDelete(messageKey)}
                    aria-label="Delete message"
                    title="Delete message"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM6 9h2v9H6V9Zm-1 0h14l-1 11H6L5 9Z" />
                    </svg>
                  </button>
                )}
                {message.createdAt && (
                  <span className={styles.messageTime}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
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
      })}
      <div ref={messagesEndRef} />
    </article>
  );
}

export default memo(MessageList);
