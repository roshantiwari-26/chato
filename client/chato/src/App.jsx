import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { getConversations } from "./api/conversations";
import useWebSocket from "./hooks/useWebsocket";

import ConversationList from "./components/ConversationList";
import ChatWindow from "./components/ChatWindow";
import Header from "./components/Header";
import Login from "./pages/Login";

import styles from "./App.module.css";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const {
    connected,
    sendMessage,
    lastMessage,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
  } = useWebSocket();

  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await getConversations();
        setConversations(data.conversations);
      } catch (error) {
        console.error(error);
      }
    }

    loadConversations();
  }, [lastMessage]);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("http://localhost:3000/api/auth/me", {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setCurrentUser(data.user);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    }

    fetchCurrentUser();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <div className={styles.app}>
            <Header />

            <main className={styles.chatLayout}>
              <ConversationList
                currentUser={currentUser}
                conversations={conversations}
                selectedConversationId={selectedConversation?._id}
                onSelectConversation={setSelectedConversation}
              />

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
              />
            </main>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
