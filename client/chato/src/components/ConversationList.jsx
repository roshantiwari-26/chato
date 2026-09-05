import styles from "./ConversationList.module.css";

function ConversationList({
  conversations,
  onSelectConversation,
  currentUser,
  selectedConversationId,
  unreadCounts,
  markConversationUnreadAsRead,
}) {
  return (
    <aside className={styles.conversationList}>
      <div className={styles.conversationListHeader}>
        <h2>Chats</h2>
      </div>

      <div className={styles.conversationItems}>
        {conversations.length === 0 ? (
          <p className={styles.emptyState}>No conversations yet.</p>
        ) : (
          conversations.map((conversation) => {
            const otherUser = conversation.participants.find(
              (user) => user._id !== currentUser?.id,
            );

            const selected = conversation._id === selectedConversationId;

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
                    <strong>{otherUser?.username}</strong>

                    {unreadCounts?.[conversation._id] > 0 && (
                      <span className={styles.unreadCount}>
                        {unreadCounts[conversation._id]}
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

export default ConversationList;
