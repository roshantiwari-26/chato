import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useWebSocket from "../hooks/useWebsocket";

import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import Header from "../components/Header";

import styles from "../App.module.css";

function Home() {
  const { currentUser } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);

  const {
    connected,
    sendMessage,
    lastMessage,
    unreadCounts,
    markConversationUnreadAsRead,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  } = useWebSocket(selectedConversation?._id);

  async function handleStartConversation(user) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: user._id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start conversation");
      }

      setSelectedConversation(data.conversation);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }

  return (
    <div className={styles.app}>
      <Header currentUser={currentUser} />

      <main
        className={`${styles.chatLayout} ${
          selectedConversation ? styles.chatSelected : ""
        }`}
      >
        <div className={styles.sidebarSection}>
          <ConversationList
            currentUser={currentUser}
            selectedConversationId={selectedConversation?._id}
            onSelectConversation={setSelectedConversation}
            unreadCounts={unreadCounts}
            markConversationUnreadAsRead={markConversationUnreadAsRead}
            onStartConversation={handleStartConversation}
          />
        </div>

        <div className={styles.chatSection}>
          <ChatWindow
            currentUser={currentUser}
            conversation={selectedConversation}
            sendMessage={sendMessage}
            connected={connected}
            lastMessage={lastMessage}
            subscribeToPresence={subscribeToPresence}
            unsubscribePresence={unsubscribePresence}
            sendTypingStart={sendTypingStart}
            sendTypingStop={sendTypingStop}
            sendMessageRead={sendMessageRead}
            sendConversationRead={sendConversationRead}
            sendMessageDelete={sendMessageDelete}
            onBack={() => setSelectedConversation(null)}
          />
        </div>
      </main>
    </div>
  );
}

export default Home;
