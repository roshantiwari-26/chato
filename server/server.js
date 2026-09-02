const http = require("http");
const app = require("./app");
const initializeWebSocket = require("./wss");
const connectDatabase = require("./config/db");

const server = http.createServer(app);

connectDatabase()
  .then(() => {
    initializeWebSocket(server);
    server.listen(3000, () => {
      console.log("🚀 Server running on http://localhost:3000");
    });
  })
  .catch((error) => {
    console.error("❌ Server starting failed due to DB error:", error.message);
  });
