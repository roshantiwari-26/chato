import { useState } from "react";
import { Navigate } from "react-router-dom";
import styles from "./Login.module.css";

function Login() {
  const [credentials, setCredentials] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  function handleChange(type, value) {
    setCredentials({ ...credentials, [type]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    setIsAuthenticated(true);

    console.log(JSON.stringify(data, null, 2));
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.header}>
          <h1>
            Welcome to <span>ChatO</span>
          </h1>
          <p>Login to continue chatting</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="abc123@example.com"
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>

          <button className={styles.loginButton} type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
