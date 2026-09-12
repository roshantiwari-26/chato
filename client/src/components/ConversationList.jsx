import { memo, useEffect, useState } from "react";
import styles from "./ConversationList.module.css";
import { getConversations } from "../api/conversations";
import { searchUsers } from "../api/users";

const getNormalizedId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  return value._id?.toString() || value.id?.toString() || null;
};

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

  const currentUserId = getNormalizedId(currentUser);
  const selectedId = getNormalizedId(selectedConversationId);

  useEffect(() => {
    let isCancelled = false;

    async function loadConversations() {
      try {
        const data = await getConversations();

        if (isCancelled) {
          return;
        }

        setConversations(data.conversations || []);
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load conversations:", error);
        }
      }
    }

    loadConversations();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const data = await searchUsers(query);

        if (isCancelled) {
          return;
        }

        setSearchResults(data.users || []);
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to search users:", error);
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  async function handleStartConversation(user) {
    const conversation = await onStartConversation(user);

    if (conversation) {
      setConversations((previousConversations) => {
        const conversationId = getNormalizedId(conversation);

        const exists = previousConversations.some(
          (item) => getNormalizedId(item) === conversationId,
        );

        if (exists) {
          return previousConversations;
        }

        return [conversation, ...previousConversations];
      });
    }

    setSearchQuery("");
  }

  return (
    <aside className={styles.conversationList}>
      <div className={styles.conversationListHeader}>
        <div className={styles.headerTop}>
          <h2>Chats</h2>
        </div>
        <div className={styles.searchWrapper}>
          <input
            type="search"
            placeholder="Search a user on ChatO..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.searchInput}
            autoComplete="off"
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
                    key={getNormalizedId(user)}
                    type="button"
                    className={styles.searchResult}
                    onClick={() => handleStartConversation(user)}
                  >
                    <div className={styles.avatar}>
                      {user.username?.charAt(0).toUpperCase() || "?"}
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
            const conversationId = getNormalizedId(conversation);

            const otherUser = conversation.participants?.find(
              (user) => getNormalizedId(user) !== currentUserId,
            );

            const selected = conversationId === selectedId;
            const unread = unreadCounts?.[conversationId] || 0;

            return (
              <button
                key={conversationId}
                type="button"
                className={`${styles.conversationItem} ${
                  selected ? styles.selected : ""
                }`}
                onClick={() => {
                  onSelectConversation(conversation);
                  markConversationUnreadAsRead(conversationId);
                }}
              >
                <div className={styles.avatar}>
                  {otherUser?.username?.charAt(0).toUpperCase() || "?"}
                </div>

                <div className={styles.conversationInfo}>
                  <div className={styles.conversationTop}>
                    <strong className={styles.username}>
                      {otherUser?.username || "Unknown User"}
                    </strong>

                    {unread > 0 && (
                      <span className={styles.unreadCount}>
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>

                  <span className={styles.email}>{otherUser?.email || ""}</span>
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
