import { createContext, useContext, useMemo } from "react";
import useWebSocket from "../hooks/useWebsocket";

const WebSocketActionsContext = createContext(null);
const WebSocketConnectionContext = createContext(null);
const WebSocketEventContext = createContext(null);
const WebSocketUnreadContext = createContext(null);

export function WebSocketProvider({ children, activeConversationId }) {
  const webSocket = useWebSocket(activeConversationId);

  const {
    connected,
    lastMessage,
    unreadCounts,
    markConversationUnreadAsRead,
    sendMessage,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  } = webSocket;

  const actions = useMemo(
    () => ({
      sendMessage,
      subscribeToPresence,
      unsubscribePresence,
      sendTypingStart,
      sendTypingStop,
      sendMessageRead,
      sendConversationRead,
      sendMessageDelete,
      markConversationUnreadAsRead,
    }),
    [
      sendMessage,
      subscribeToPresence,
      unsubscribePresence,
      sendTypingStart,
      sendTypingStop,
      sendMessageRead,
      sendConversationRead,
      sendMessageDelete,
      markConversationUnreadAsRead,
    ],
  );

  const connection = useMemo(
    () => ({
      connected,
    }),
    [connected],
  );

  const events = useMemo(
    () => ({
      lastMessage,
    }),
    [lastMessage],
  );

  const unread = useMemo(
    () => ({
      unreadCounts,
      markConversationUnreadAsRead,
    }),
    [unreadCounts, markConversationUnreadAsRead],
  );

  return (
    <WebSocketActionsContext.Provider value={actions}>
      <WebSocketUnreadContext.Provider value={unread}>
        <WebSocketConnectionContext.Provider value={connection}>
          <WebSocketEventContext.Provider value={events}>
            {children}
          </WebSocketEventContext.Provider>
        </WebSocketConnectionContext.Provider>
      </WebSocketUnreadContext.Provider>
    </WebSocketActionsContext.Provider>
  );
}

export function useWebSocketActions() {
  const context = useContext(WebSocketActionsContext);

  if (!context) {
    throw new Error(
      "useWebSocketActions must be used inside WebSocketProvider",
    );
  }

  return context;
}

export function useWebSocketConnection() {
  const context = useContext(WebSocketConnectionContext);

  if (!context) {
    throw new Error(
      "useWebSocketConnection must be used inside WebSocketProvider",
    );
  }

  return context;
}

export function useWebSocketEvents() {
  const context = useContext(WebSocketEventContext);

  if (!context) {
    throw new Error("useWebSocketEvents must be used inside WebSocketProvider");
  }

  return context;
}

export function useWebSocketUnread() {
  const context = useContext(WebSocketUnreadContext);

  if (!context) {
    throw new Error("useWebSocketUnread must be used inside WebSocketProvider");
  }

  return context;
}
