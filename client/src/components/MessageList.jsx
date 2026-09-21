import { useEffect, useRef, memo, useCallback, useState } from "react";
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

const MessageItem = memo(
  ({ message, isMine, onContextMenu, isContextMenuOpen, onImageClick }) => {
    const isDeleted = Boolean(message.deletedAt);
    const messageId = getNormalizedId(message);

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
          } ${isContextMenuOpen ? styles.messageBubbleSelected : ""}`}
          onContextMenu={
            isDeleted
              ? (event) => event.preventDefault()
              : (event) => onContextMenu(event, message)
          }
        >
          {message.replyTo && (
            <div className={styles.replyMessage}>
              <span className={styles.replyMessageLabel}>
                {isMine ? "Reply" : "You"}
              </span>

              {message.replyTo.deletedAt ? (
                <p>This message was deleted</p>
              ) : message.replyTo.type === "image" ? (
                <img
                  className={styles.replyMessageImage}
                  src={message.replyTo.imageUrl}
                  alt="Replied image"
                />
              ) : (
                <p>{message.replyTo.text}</p>
              )}
            </div>
          )}
          {isDeleted ? (
            <p className={styles.deletedMessage}>This message was deleted</p>
          ) : message.type === "image" ? (
            <img
              className={styles.messageImage}
              src={message.imageUrl}
              alt="Shared image"
              onClick={() => onImageClick(message.imageUrl)}
            />
          ) : (
            <p>{message.text}</p>
          )}
          <div className={styles.messageMeta}>
            {formattedTime && (
              <span className={styles.messageTime}>{formattedTime}</span>
            )}

            {isMine && (
              <span className={`${styles.messageStatus} ${statusClass}`}>
                <strong>{statusText}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

// Message List

function MessageList({
  messages = [],
  currentUserId,
  sendMessageDelete,
  onReply,
}) {
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(messages.length);
  const [contextMenu, setContextMenu] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  const contextMenuIsMine = contextMenu
    ? getNormalizedId(contextMenu.message.senderId) ===
      getNormalizedId(currentUserId)
    : false;

  const handleContextMenu = useCallback(
    (event, message) => {
      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();

      const isMine =
        getNormalizedId(message.senderId) === getNormalizedId(currentUserId);

      setContextMenu({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        isMine,
        message,
      });
    },
    [currentUserId],
  );

  const handleContextMenuDelete = useCallback(() => {
    const messageId = getNormalizedId(contextMenu?.message);

    if (!messageId) {
      return;
    }

    sendMessageDelete(messageId);
    setContextMenu(null);
  }, [contextMenu, sendMessageDelete]);

  const handleImageClick = useCallback((imageUrl) => {
    setViewingImage(imageUrl);
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [contextMenu]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;

    if (messages.length > previousCount) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }

    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!viewingImage) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setViewingImage(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewingImage]);

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
            onContextMenu={handleContextMenu}
            onImageClick={handleImageClick}
            isContextMenuOpen={
              contextMenu &&
              getNormalizedId(contextMenu.message) === getNormalizedId(message)
            }
          />
        );
      })}

      <div ref={messagesEndRef} />
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            left: contextMenu.isMine
              ? contextMenu.x - 148
              : contextMenu.x + contextMenu.width + 8,
            top: contextMenu.y,
          }}
        >
          {contextMenuIsMine ? (
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={handleContextMenuDelete}
            >
              Delete
            </button>
          ) : (
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={() => {
                onReply(contextMenu.message);
                setContextMenu(null);
              }}
            >
              Reply
            </button>
          )}
        </div>
      )}

      {viewingImage && (
        <div
          className={styles.imageViewer}
          onClick={() => setViewingImage(null)}
        >
          <button
            type="button"
            className={styles.imageViewerClose}
            onClick={() => setViewingImage(null)}
            aria-label="Close image"
          >
            ×
          </button>

          <img
            className={styles.imageViewerImage}
            src={viewingImage}
            alt="Full size"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}

export default memo(MessageList);
