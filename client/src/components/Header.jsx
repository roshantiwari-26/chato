import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import { useAuth } from "../context/AuthContext";

function Header({ currentUser }) {
  const { logout } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className={styles.header}>
      <h1>ChatO</h1>

      <nav>
        {currentUser ? (
          <div className={styles.profile}>
            <button
              type="button"
              className={styles.avatar}
              onClick={() => setShowProfileMenu((previous) => !previous)}
            >
              {currentUser.username[0]}
            </button>

            {showProfileMenu && (
              <div className={styles.profileMenu}>
                <div className={styles.profileInfo}>
                  <strong>{currentUser.username}</strong>
                  <span>{currentUser.email}</span>
                </div>

                <div className={styles.divider} />

                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
