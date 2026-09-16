const WebSocket = require("ws");
const mongoose = require("mongoose");
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

  function send(socket, type, payload = {}, extra = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type,
        payload,
        ...extra,
      }),
    );

    return true;
  }

  function isValidObjectId(id) {
    return Boolean(id) && mongoose.Types.ObjectId.isValid(id);
  }

  function sendPresenceStatus(toUserId, targetUserId, type) {
    const socket = onlineUsers.get(toUserId);

    if (!socket) {
      return;
    }

    send(socket, type, {
      userId: targetUserId,
    });
  }

  async function deliverPendingMessages(userId) {
    const pendingMessages = await Message.find({
      receiverId: userId,
      deliveredAt: null,
    });

    for (const message of pendingMessages) {
      if (message.deliveredAt) {
        continue;
      }

      message.deliveredAt = new Date();
      await message.save();

      const senderSocket = onlineUsers.get(message.senderId.toString());

      if (!senderSocket) {
        continue;
      }

      send(senderSocket, "message.delivered", {
        messageId: message._id,
        deliveredAt: message.deliveredAt,
      });
    }
  }

  async function getUnreadCounts(userId) {
    return Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
          readAt: null,
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: {
            $sum: 1,
          },
        },
      },
    ]);
  }

  server.on("upgrade", (request, socket, head) => {
    console.log("🔵 WebSocket upgrade request:", request.url);
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

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = decoded;
        wss.emit("connection", ws, request);
      });
    } catch (error) {
      console.error("WebSocket authentication failed:", error.message);
      socket.destroy();
    }
  });

  wss.on("connection", async (socket) => {
    const connectedUserId = socket.user.userId;

    console.log("🟢 ONLINE:", socket.user.email);

    const previousSocket = onlineUsers.get(connectedUserId);

    if (previousSocket && previousSocket !== socket) {
      previousSocket.close();
    }

    onlineUsers.set(connectedUserId, socket);

    try {
      await deliverPendingMessages(connectedUserId);

      const unreadCounts = await getUnreadCounts(connectedUserId);

      send(socket, "conversation.unread", {
        counts: unreadCounts,
      });

      const watchers = presenceWatchers.get(connectedUserId);

      if (watchers) {
        for (const watcherUserId of watchers) {
          sendPresenceStatus(watcherUserId, connectedUserId, "presence.online");
        }
      }
    } catch (error) {
      console.error("WebSocket connection initialization failed:", error);
    }

    socket.on("message", async (rawMessage) => {
      let data;
      let clientMessageId;

      try {
        data = JSON.parse(rawMessage.toString());

        if (!data || typeof data !== "object") {
          return;
        }

        clientMessageId = data.payload?.clientMessageId;

        if (data.type === "presence.subscribe") {
          const { userId } = data.payload || {};

          if (!userId) {
            return;
          }

          if (!presenceWatchers.has(userId)) {
            presenceWatchers.set(userId, new Set());
          }

          presenceWatchers.get(userId).add(connectedUserId);

          const targetSocket = onlineUsers.get(userId);

          send(socket, targetSocket ? "presence.online" : "presence.offline", {
            userId,
          });

          return;
        }

        if (data.type === "presence.unsubscribe") {
          const { userId } = data.payload || {};

          if (!userId) {
            return;
          }

          const watchers = presenceWatchers.get(userId);

          if (!watchers) {
            return;
          }

          watchers.delete(connectedUserId);

          if (watchers.size === 0) {
            presenceWatchers.delete(userId);
          }

          return;
        }

        if (data.type === "typing.start") {
          const { receiverId } = data.payload || {};

          if (!receiverId) {
            return;
          }

          const targetSocket = onlineUsers.get(receiverId);

          if (!targetSocket) {
            return;
          }

          send(targetSocket, "typing.start", {
            userId: connectedUserId,
          });

          return;
        }

        if (data.type === "typing.stop") {
          const { receiverId } = data.payload || {};

          if (!receiverId) {
            return;
          }

          const targetSocket = onlineUsers.get(receiverId);

          if (!targetSocket) {
            return;
          }

          send(targetSocket, "typing.stop", {
            userId: connectedUserId,
          });

          return;
        }

        if (data.type === "message.delivered") {
          const { messageId } = data.payload || {};

          if (!isValidObjectId(messageId)) {
            return;
          }

          const message = await Message.findById(messageId);

          if (!message) {
            return;
          }

          if (message.receiverId.toString() !== connectedUserId.toString()) {
            return;
          }

          if (!message.deliveredAt) {
            message.deliveredAt = new Date();
            await message.save();
          }

          const senderSocket = onlineUsers.get(message.senderId.toString());

          send(senderSocket, "message.delivered", {
            messageId: message._id,
            deliveredAt: message.deliveredAt,
          });

          return;
        }

        if (data.type === "conversation.read") {
          const { conversationId } = data.payload || {};

          if (!isValidObjectId(conversationId)) {
            return;
          }

          const readAt = new Date();

          await Message.updateMany(
            {
              conversationId,
              receiverId: connectedUserId,
              readAt: null,
            },
            {
              $set: {
                readAt,
              },
            },
          );

          const message = await Message.findOne({
            conversationId,
            receiverId: connectedUserId,
          })
            .select("senderId")
            .sort({ createdAt: -1 });

          if (!message) {
            return;
          }

          const senderId = message.senderId.toString();
          const senderSocket = onlineUsers.get(senderId);

          send(senderSocket, "conversation.read", {
            conversationId,
            senderId,
            readAt,
          });

          return;
        }

        if (data.type === "message.read") {
          const { messageId } = data.payload || {};

          if (!isValidObjectId(messageId)) {
            return;
          }

          const message = await Message.findById(messageId);

          if (!message) {
            return;
          }

          if (message.receiverId.toString() !== connectedUserId.toString()) {
            return;
          }

          if (message.readAt) {
            return;
          }

          message.readAt = new Date();
          await message.save();

          const senderSocket = onlineUsers.get(message.senderId.toString());

          send(senderSocket, "message.read", {
            messageId: message._id,
            readAt: message.readAt,
          });

          return;
        }

        if (data.type === "message.delete") {
          const { messageId } = data.payload || {};

          if (!isValidObjectId(messageId)) {
            return;
          }

          const message = await Message.findById(messageId);

          if (!message) {
            return;
          }

          if (message.senderId.toString() !== connectedUserId.toString()) {
            return;
          }

          if (message.deletedAt) {
            return;
          }

          message.deletedAt = new Date();
          await message.save();

          const deletedPayload = {
            messageId: message._id,
            deletedAt: message.deletedAt,
          };

          send(socket, "message.deleted", deletedPayload);

          const receiverSocket = onlineUsers.get(message.receiverId.toString());

          send(receiverSocket, "message.deleted", deletedPayload);

          return;
        }

        if (data.type === "message.send") {
          const { receiverId, text } = data.payload || {};

          clientMessageId = data.payload?.clientMessageId;

          if (!receiverId || typeof text !== "string" || !text.trim()) {
            send(
              socket,
              "message.error",
              {},
              {
                message: "Recipient and text are required",
              },
            );

            return;
          }

          if (!isValidObjectId(receiverId)) {
            send(
              socket,
              "message.error",
              {},
              {
                message: "Invalid recipient",
              },
            );

            return;
          }

          const senderId = connectedUserId;

          if (receiverId.toString() === senderId.toString()) {
            send(
              socket,
              "message.error",
              {},
              {
                message: "You cannot send a message to yourself",
              },
            );

            return;
          }

          const conversation = await findOrCreateConversation(
            senderId,
            receiverId,
          );

          const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            receiverId,
            text: text.trim(),
          });

          conversation.updatedAt = new Date();
          await conversation.save();

          send(socket, "message.ack", {
            clientMessageId,
            messageId: message._id,
            conversationId: conversation._id,
            createdAt: message.createdAt,
          });

          const targetSocket = onlineUsers.get(receiverId.toString());

          if (!targetSocket) {
            return;
          }

          send(targetSocket, "message.new", {
            id: message._id,
            conversationId: conversation._id,
            senderId,
            receiverId,
            text: message.text,
            createdAt: message.createdAt,
          });

          return;
        }
      } catch (error) {
        console.error("Message handling failed:", error);

        send(
          socket,
          "message.error",
          {
            clientMessageId,
          },
          {
            message: "Failed to process WebSocket message",
          },
        );
      }
    });

    socket.on("close", () => {
      const disconnectedUserId = socket.user.userId;

      if (onlineUsers.get(disconnectedUserId) !== socket) {
        return;
      }

      onlineUsers.delete(disconnectedUserId);

      for (const [targetUserId, watchers] of presenceWatchers) {
        if (watchers.has(disconnectedUserId)) {
          watchers.delete(disconnectedUserId);

          if (watchers.size === 0) {
            presenceWatchers.delete(targetUserId);
          }
        }
      }

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
