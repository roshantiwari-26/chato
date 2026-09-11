const http = require("http");
const app = require("./app");
const initializeWebSocket = require("./wss");
const connectDatabase = require("./config/db");

const server = http.createServer(app);
const port = process.env.PORT || 3000;

connectDatabase()
  .then(() => {
    initializeWebSocket(server);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Server starting failed due to DB error:", error.message);
  });
