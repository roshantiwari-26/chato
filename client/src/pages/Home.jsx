import { memo, useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { WebSocketProvider } from "../context/WebSocketContext";

import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import Header from "../components/Header";

import styles from "../App.module.css";

const HomeContent = memo(function HomeContent({
  currentUser,
  selectedConversation,
  setSelectedConversation,
  handleStartConversation,
}) {
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
            onStartConversation={handleStartConversation}
          />
        </div>

        <div className={styles.chatSection}>
          <ChatWindow
            currentUser={currentUser}
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        </div>
      </main>
    </div>
  );
});

function Home() {
  const { currentUser } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleStartConversation = useCallback(async (user) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/conversations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: user._id }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start conversation");
      }

      setSelectedConversation(data.conversation);
      return data.conversation;
    } catch (error) {
      console.error("Failed to start conversation:", error);
      return null;
    }
  }, []);

  return (
    <WebSocketProvider activeConversationId={selectedConversation?._id}>
      <HomeContent
        currentUser={currentUser}
        selectedConversation={selectedConversation}
        setSelectedConversation={setSelectedConversation}
        handleStartConversation={handleStartConversation}
      />
    </WebSocketProvider>
  );
}

export default Home;
