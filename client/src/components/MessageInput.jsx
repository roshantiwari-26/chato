import { useEffect, useRef, useState, memo } from "react";
import styles from "./MessageInput.module.css";

function MessageInput({
  onSend,
  connected,
  receiverId,
  sendTypingStart,
  sendTypingStop,
}) {
  // --------------------------------
  // Refactoring Log
  // --------------------------------
  console.log("⌨️ MessageInput render");

  const [text, setText] = useState("");

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  function handleChange(event) {
    const value = event.target.value;

    setText(value);

    if (!connected || !receiverId) {
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStart(receiverId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingStop(receiverId);
    }, 1000);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText || !connected) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStop(receiverId);
    }

    onSend(trimmedText);

    setText("");
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current && receiverId) {
        sendTypingStop(receiverId);
      }
    };
  }, [receiverId, sendTypingStop]);

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
