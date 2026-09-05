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

  async function deliverPendingMessages(userId) {
    const pendingMessages = await Message.find({
      receiverId: userId,
      deliveredAt: null,
    });

    for (const message of pendingMessages) {
      message.deliveredAt = new Date();
      await message.save();

      const senderSocket = onlineUsers.get(message.senderId.toString());

      if (!senderSocket) {
        continue;
      }

      senderSocket.send(
        JSON.stringify({
          type: "message.delivered",
          payload: {
            messageId: message._id,
            deliveredAt: message.deliveredAt,
          },
        }),
      );
    }
  }

  async function getUnreadCounts(userId) {
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
          readAt: null,
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    return unreadMessages;
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

  wss.on("connection", async (socket) => {
    const connectedUserId = socket.user.userId;

    console.log("🟢 ONLINE:", socket.user.email);

    onlineUsers.set(connectedUserId, socket);
    await deliverPendingMessages(connectedUserId);

    const unreadCounts = await getUnreadCounts(connectedUserId);

    socket.send(
      JSON.stringify({
        type: "conversation.unread",
        payload: {
          counts: unreadCounts,
        },
      }),
    );

    const watchers = presenceWatchers.get(connectedUserId);

    if (watchers) {
      for (const watcherUserId of watchers) {
        sendPresenceStatus(watcherUserId, connectedUserId, "presence.online");
      }
    }

    socket.on("message", async (rawMessage) => {
      let clientMessageId;
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

        // message delivery receipt
        if (data.type === "message.delivered") {
          const { messageId } = data.payload;

          if (!messageId) {
            return;
          }

          const message = await Message.findById(messageId);

          if (!message) {
            return;
          }

          if (message.senderId.toString() === socket.user.userId.toString()) {
            return;
          }

          if (!message.deliveredAt) {
            message.deliveredAt = new Date();
            await message.save();
          }

          const senderSocket = onlineUsers.get(message.senderId.toString());

          if (!senderSocket) {
            return;
          }

          senderSocket.send(
            JSON.stringify({
              type: "message.delivered",
              payload: {
                messageId: message._id,
                deliveredAt: message.deliveredAt,
              },
            }),
          );

          return;
        }

        // conversation read receipt
        if (data.type === "conversation.read") {
          const { conversationId } = data.payload;

          if (!conversationId) {
            return;
          }

          const readAt = new Date();

          await Message.updateMany(
            {
              conversationId,
              receiverId: socket.user.userId,
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
            receiverId: socket.user.userId,
          }).select("senderId");

          if (!message) {
            return;
          }

          const senderSocket = onlineUsers.get(message.senderId.toString());

          if (!senderSocket) {
            return;
          }

          senderSocket.send(
            JSON.stringify({
              type: "conversation.read",
              payload: {
                conversationId,
                readAt,
              },
            }),
          );

          return;
        }

        // message read receipt
        if (data.type === "message.read") {
          const { messageId } = data.payload;

          if (!messageId) {
            return;
          }

          const message = await Message.findById(messageId);

          if (!message) {
            return;
          }

          if (message.receiverId.toString() !== socket.user.userId.toString()) {
            return;
          }

          if (message.readAt) {
            return;
          }

          message.readAt = new Date();
          await message.save();

          const senderSocket = onlineUsers.get(message.senderId.toString());

          if (!senderSocket) {
            return;
          }

          senderSocket.send(
            JSON.stringify({
              type: "message.read",
              payload: {
                messageId: message._id,
                readAt: message.readAt,
              },
            }),
          );

          return;
        }

        // message.send
        if (data.type !== "message.send") {
          return;
        }

        const { receiverId, text } = data.payload;
        clientMessageId = data.payload?.clientMessageId;

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
          receiverId,
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
            payload: {
              clientMessageId,
            },
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
