const WebSocket = require("ws");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

const Message = require("./models/messageModel");
const { findOrCreateConversation } = require("./services/conversationService");

function initializeWebSocket(server) {
  const wss = new WebSocket.Server({
    noServer: true,
  });
  const onlineUsers = new Map();
  const presenceWatchers = new Map();

  function sendPresenceStatus(toUserId, targetUserId, type) {
    const socket = onlineUsers.get(toUserId);

    if (!socket) {
      return;
    }

    socket.send(
      JSON.stringify({
        type,
        payload: {
          userId: targetUserId,
        },
      }),
    );
  }

  server.on("upgrade", (request, socket, head) => {
    try {
      const cookieHeader = request.headers.cookie;

      if (!cookieHeader) {
        socket.destroy();
        return;
      }

      const cookies = cookie.parseCookie(cookieHeader);
      const token = cookies.accessToken;

      if (!token) {
        socket.destroy();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: process.env.JWT_ISSUER,
      });
      console.log("🔐 Authenticated WebSocket:", decoded.email);

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = decoded;
        wss.emit("connection", ws, request);
      });
    } catch (error) {
      console.log(error.message);
      socket.destroy();
    }
  });

  wss.on("connection", (socket) => {
    const connectedUserId = socket.user.userId;

    console.log("🟢 ONLINE:", socket.user.email);

    onlineUsers.set(connectedUserId, socket);

    const watchers = presenceWatchers.get(connectedUserId);

    if (watchers) {
      for (const watcherUserId of watchers) {
        sendPresenceStatus(watcherUserId, connectedUserId, "presence.online");
      }
    }

    socket.on("message", async (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === "presence.subscribe") {
          const { userId } = data.payload;

          if (!userId) {
            return;
          }

          //  presence.subscribe
          if (!presenceWatchers.has(userId)) {
            presenceWatchers.set(userId, new Set());
          }

          presenceWatchers.get(userId).add(socket.user.userId);

          const targetSocket = onlineUsers.get(userId);

          socket.send(
            JSON.stringify({
              type: targetSocket ? "presence.online" : "presence.offline",
              payload: {
                userId,
              },
            }),
          );

          return;
        }

        //  presence.unsubscribe
        if (data.type === "presence.unsubscribe") {
          const { userId } = data.payload;

          if (!userId) {
            return;
          }

          const watchers = presenceWatchers.get(userId);

          if (!watchers) {
            return;
          }

          watchers.delete(socket.user.userId);

          if (watchers.size === 0) {
            presenceWatchers.delete(userId);
          }

          return;
        }

        // typing indicator handling
        if (data.type === "typing.start") {
          const { receiverId } = data.payload;

          if (!receiverId) {
            return;
          }

          const targetSocket = onlineUsers.get(receiverId);

          if (!targetSocket) {
            return;
          }

          targetSocket.send(
            JSON.stringify({
              type: "typing.start",
              payload: {
                userId: socket.user.userId,
              },
            }),
          );

          return;
        }

        if (data.type === "typing.stop") {
          const { receiverId } = data.payload;

          if (!receiverId) {
            return;
          }

          const targetSocket = onlineUsers.get(receiverId);

          if (!targetSocket) {
            return;
          }

          targetSocket.send(
            JSON.stringify({
              type: "typing.stop",
              payload: {
                userId: socket.user.userId,
              },
            }),
          );

          return;
        }

        // message.send
        if (data.type !== "message.send") {
          return;
        }

        const { receiverId, text, clientMessageId } = data.payload;

        if (!receiverId || !text) {
          socket.send(
            JSON.stringify({
              type: "message.error",
              message: "Recipient and text are required",
            }),
          );

          return;
        }

        const senderId = socket.user.userId;

        const conversation = await findOrCreateConversation(
          senderId,
          receiverId,
        );

        const message = await Message.create({
          conversationId: conversation._id,
          senderId,
          text,
        });

        socket.send(
          JSON.stringify({
            type: "message.ack",
            payload: {
              clientMessageId,
              messageId: message._id,
              conversationId: conversation._id,
              createdAt: message.createdAt,
            },
          }),
        );

        const targetSocket = onlineUsers.get(receiverId);

        if (!targetSocket) {
          return;
        }

        targetSocket.send(
          JSON.stringify({
            type: "message.new",
            payload: {
              id: message._id,
              conversationId: conversation._id,
              senderId,
              text: message.text,
              createdAt: message.createdAt,
            },
          }),
        );
      } catch (error) {
        console.error("Message handling failed:", error);

        socket.send(
          JSON.stringify({
            type: "message.error",
            message: "Failed to send message",
          }),
        );
      }
    });

    // Socket.close
    socket.on("close", () => {
      const disconnectedUserId = socket.user.userId;

      if (onlineUsers.get(disconnectedUserId) !== socket) {
        return;
      }

      onlineUsers.delete(disconnectedUserId);

      const watchers = presenceWatchers.get(disconnectedUserId);

      if (watchers) {
        for (const watcherUserId of watchers) {
          sendPresenceStatus(
            watcherUserId,
            disconnectedUserId,
            "presence.offline",
          );
        }
      }

      console.log("🔴 OFFLINE:", socket.user.email);
    });
  });

  return wss;
}

module.exports = initializeWebSocket;
