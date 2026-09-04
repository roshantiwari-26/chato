import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import { useAuth } from "../context/AuthContext";

function Header({ currentUser }) {
  const { logout } = useAuth();
  return (
    <header className={styles.header}>
      <h1>ChatO</h1>
      <nav>
        {currentUser ? (
          <span onClick={logout}>{currentUser.username[0]}</span>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
