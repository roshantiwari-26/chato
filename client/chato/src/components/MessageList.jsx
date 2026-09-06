import { useRef, useEffect, memo } from "react";

import styles from "./ChatWindow.module.css";

function MessageList({ messages, currentUserId }) {
  console.log("📨 MessageList rendered");

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
              <p>{message.text}</p>

              <div className={styles.messageMeta}>
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
