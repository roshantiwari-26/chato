import { Link } from "react-router-dom";
import styles from "./Header.module.css";
function Header({ currentUser }) {
  return (
    <header className={styles.header}>
      <h1>ChatO</h1>
      <nav>
        {currentUser ? (
          <span>{currentUser.username[0]}</span>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
