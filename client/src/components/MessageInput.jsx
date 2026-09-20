import { useEffect, useRef, useState, memo, useCallback } from "react";
import styles from "./MessageInput.module.css";

function MessageInput({
  onSend,
  connected,
  receiverId,
  sendTypingStart,
  sendTypingStop,
  replyingTo,
  onCancelReply,
}) {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

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
    async (event) => {
      event.preventDefault();

      if (!connected) {
        return;
      }

      stopTyping();

      if (selectedImage) {
        try {
          const imageUrl = await uploadImage(selectedImage.file);

          onSend(null, replyingTo, {
            type: "image",
            imageUrl,
          });

          URL.revokeObjectURL(selectedImage.previewUrl);
          setSelectedImage(null);
        } catch (error) {
          console.error(error);
        }

        return;
      }

      const trimmedText = text.trim();

      if (!trimmedText) {
        return;
      }

      onSend(trimmedText, replyingTo);
      setText("");
    },
    [connected, selectedImage, text, replyingTo, stopTyping, onSend],
  );

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setSelectedImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const uploadImage = async (file) => {
    const formData = new FormData();

    formData.append("image", file);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/uploads/image`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error("Image upload failed");
    }

    const data = await response.json();

    return data.imageUrl;
  };

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
    <form
      className={styles.messageInput}
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      {replyingTo && (
        <div className={styles.replyPreview}>
          <div className={styles.replyPreviewContent}>
            <span className={styles.replyPreviewLabel}>Replying to</span>
            <p>{replyingTo.text}</p>
          </div>

          <button
            type="button"
            className={styles.replyPreviewClose}
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}
      {selectedImage && (
        <div className={styles.imagePreview}>
          <img
            className={styles.imagePreviewImage}
            src={selectedImage.previewUrl}
            alt="Preview"
          />
          <button
            type="button"
            className={styles.imagePreviewClose}
            onClick={() => setSelectedImage(null)}
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}
      <input
        className={styles.input}
        type="text"
        value={text}
        onChange={handleChange}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        data-form-type="other"
        id="message-input"
        name="chatText"
        placeholder={connected ? "Type a message..." : "Connecting..."}
        disabled={!connected}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageSelect}
        hidden
        id="imageInput"
      />

      <button
        type="button"
        className={styles.imageButton}
        onClick={() => document.getElementById("imageInput").click()}
        disabled={!connected}
      >
        📷
      </button>

      <button
        className={styles.sendButton}
        type="submit"
        disabled={!connected || (!text.trim() && !selectedImage)}
      >
        Send
      </button>
    </form>
  );
}

export default memo(MessageInput);
