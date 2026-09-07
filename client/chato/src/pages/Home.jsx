import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useWebSocket from "../hooks/useWebsocket";

import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import Header from "../components/Header";

import styles from "../App.module.css";

function Home() {
  const { currentUser } = useAuth();

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
    sendMessageDelivered,
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  } = useWebSocket();

  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className={styles.app}>
      <Header currentUser={currentUser} />

      <main className={styles.chatLayout}>
        <ConversationList
          currentUser={currentUser}
          selectedConversationId={selectedConversation?._id}
          onSelectConversation={setSelectedConversation}
          unreadCounts={unreadCounts}
          markConversationUnreadAsRead={markConversationUnreadAsRead}
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
          sendMessageDelivered={sendMessageDelivered}
          sendMessageRead={sendMessageRead}
          sendConversationRead={sendConversationRead}
          sendMessageDelete={sendMessageDelete}
        />
      </main>
    </div>
  );
}

export default Home;
