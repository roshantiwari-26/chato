import { memo, useState, useEffect } from "react";
import styles from "./ConversationList.module.css";
import { getConversations } from "../api/conversations";
import { searchUsers } from "../api/users";

function ConversationList({
  onSelectConversation,
  currentUser,
  selectedConversationId,
  unreadCounts,
  markConversationUnreadAsRead,
  onStartConversation,
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await getConversations();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }
    }

    loadConversations();
  }, []);

  useEffect(() => {
    async function search() {
      try {
        setSearching(true);
        const data = await searchUsers(searchQuery);
        setSearchResults(data.users || []);
      } catch (error) {
        console.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      search();
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <aside className={styles.conversationList}>
      <div className={styles.conversationListHeader}>
        <div className={styles.headerTop}>
          <h2>Chats</h2>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.searchInput}
          />

          {searchQuery.trim() && (
            <div className={styles.searchResults}>
              {searching ? (
                <p className={styles.searchStateText}>Searching users...</p>
              ) : searchResults.length === 0 ? (
                <p className={styles.searchStateText}>No users found.</p>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    className={styles.searchResult}
                    onClick={() => {
                      onStartConversation(user);
                      setSearchQuery("");
                    }}
                  >
                    <div className={styles.avatar}>
                      {user.username?.charAt(0).toUpperCase()}
                    </div>

                    <div className={styles.conversationInfo}>
                      <strong className={styles.username}>
                        {user.username}
                      </strong>
                      <span className={styles.email}>{user.email}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.conversationItems}>
        {conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No conversations yet.</p>
            <span>Search for a user above to start chatting.</span>
          </div>
        ) : (
          conversations.map((conversation) => {
            const otherUser = conversation.participants?.find(
              (user) => user._id !== currentUser?.id,
            );

            const selected = conversation._id === selectedConversationId;
            const unread = unreadCounts?.[conversation._id];

            return (
              <button
                key={conversation._id}
                className={`${styles.conversationItem} ${
                  selected ? styles.selected : ""
                }`}
                onClick={() => {
                  onSelectConversation(conversation);
                  markConversationUnreadAsRead(conversation._id);
                }}
              >
                <div className={styles.avatar}>
                  {otherUser?.username?.charAt(0).toUpperCase()}
                </div>

                <div className={styles.conversationInfo}>
                  <div className={styles.conversationTop}>
                    <strong className={styles.username}>
                      {otherUser?.username}
                    </strong>
                    {unread > 0 && (
                      <span className={styles.unreadCount}>
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>

                  <span className={styles.email}>{otherUser?.email}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default memo(ConversationList);
