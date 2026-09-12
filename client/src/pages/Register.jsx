import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { id, value } = event.target;

    setCredentials((previous) => ({
      ...previous,
      [id]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await register(credentials);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={styles.loginPage}>
      {" "}
      <section className={styles.loginCard}>
        {" "}
        <div className={styles.header}>
          {" "}
          <h1>
            Join <span>ChatO</span>{" "}
          </h1>
          <p>Create your account to start chatting</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p role="alert">{error}</p>}

          <div className={styles.field}>
            <label htmlFor="username">Username</label>

            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="abc123@example.com"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Create a password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </div>

          <button
            className={styles.loginButton}
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <div className={styles.footer}>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
