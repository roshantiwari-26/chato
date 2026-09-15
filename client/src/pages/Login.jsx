import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

function Login() {
  const { login, isAuthenticated } = useAuth();

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(type, value) {
    if (errorMessage) {
      setErrorMessage("");
    }

    setCredentials((previousCredentials) => ({
      ...previousCredentials,
      [type]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const sanitizedEmail = credentials.email.trim();

    if (!sanitizedEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      await login({
        email: sanitizedEmail,
        password: credentials.password,
      });
    } catch (error) {
      console.error("Login failed:", error);

      const displayError = "Invalid email or password. Please try again.";

      setErrorMessage(displayError);
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.cookieNotice} role="note">
        <strong>⚠️ Browser cookies required ⚠️</strong>
        <p>
          ChatO uses cookies for authentication and real-time messaging. If your
          browser blocks third-party cookies, some features may not work
          correctly. Please allow third-party cookies for ChatO.{" "}
          <a
            href="https://support.google.com/accounts/answer/61416?hl=en&co=GENIE.Platform%3DDesktop"
            target="_blank"
          >
            Learn how
          </a>
        </p>
      </div>
      <section className={styles.loginCard}>
        <div className={styles.header}>
          <h1>
            Welcome to <span>ChatO</span>
          </h1>
          <p>Login to continue chatting</p>
        </div>

        {errorMessage && (
          <div className={styles.errorMessage} role="alert" aria-live="polite">
            {errorMessage}
          </div>
        )}

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <div className={styles.field}>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="abc123@example.com"
              value={credentials.email}
              onChange={(event) => handleChange("email", event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={(event) => handleChange("password", event.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            className={styles.loginButton}
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
