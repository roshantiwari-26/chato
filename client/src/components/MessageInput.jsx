import { useEffect, useRef, useState, memo, useCallback } from "react";
import styles from "./MessageInput.module.css";

function MessageInput({
  onSend,
  connected,
  receiverId,
  sendTypingStart,
  sendTypingStop,
}) {
  const [text, setText] = useState("");

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const previousReceiverIdRef = useRef(receiverId);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const stopTyping = useCallback(() => {
    clearTypingTimeout();

    if (isTypingRef.current && receiverId) {
      isTypingRef.current = false;
      sendTypingStop?.(receiverId);
    }
  }, [clearTypingTimeout, receiverId, sendTypingStop]);

  const handleChange = useCallback(
    (event) => {
      const value = event.target.value;
      setText(value);

      if (!connected || !receiverId) {
        stopTyping();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingStart?.(receiverId);
      }

      clearTypingTimeout();

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1500);
    },
    [connected, receiverId, sendTypingStart, clearTypingTimeout, stopTyping],
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const trimmedText = text.trim();

      if (!trimmedText || !connected) {
        return;
      }

      stopTyping();
      onSend(trimmedText);
      setText("");
    },
    [text, connected, stopTyping, onSend],
  );

  useEffect(() => {
    if (previousReceiverIdRef.current !== receiverId) {
      if (isTypingRef.current && previousReceiverIdRef.current) {
        sendTypingStop?.(previousReceiverIdRef.current);
      }

      clearTypingTimeout();
      isTypingRef.current = false;
      previousReceiverIdRef.current = receiverId;
    }
  }, [receiverId, sendTypingStop, clearTypingTimeout]);

  useEffect(() => {
    if (!connected) {
      stopTyping();
    }
  }, [connected, stopTyping]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return (
    <form className={styles.messageInput} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={text}
        onChange={handleChange}
        placeholder={connected ? "Type a message..." : "Connecting..."}
        disabled={!connected}
      />

      <button
        className={styles.sendButton}
        type="submit"
        disabled={!connected || !text.trim()}
      >
        Send
      </button>
    </form>
  );
}

export default memo(MessageInput);
