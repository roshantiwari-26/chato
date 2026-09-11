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

  const stopTyping = useCallback(() => {
    if (isTypingRef.current && receiverId) {
      isTypingRef.current = false;
      sendTypingStop?.(receiverId);
    }
  }, [receiverId, sendTypingStop]);

  function handleChange(event) {
    const value = event.target.value;
    setText(value);

    if (!connected || !receiverId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStart?.(receiverId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1500);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText || !connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    stopTyping();
    onSend(trimmedText);
    setText("");
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
