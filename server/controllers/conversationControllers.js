const mongoose = require("mongoose");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const AppError = require("../config/AppError");
const { findOrCreateConversation } = require("../services/conversationService");
const { encodeCursor, decodeCursor } = require("../utils/cursor");

async function createConversation(req, res, next) {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.userId;

    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    if (currentUserId.toString() === userId.toString()) {
      throw new AppError("You cannot start a conversation with yourself", 400);
    }

    const conversation = await findOrCreateConversation(currentUserId, userId);

    await conversation.populate("participants", "_id username email");

    res.status(200).json({
      conversation,
    });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;

    const userId = req.user.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    let limit = Number(req.query.limit) || 50;

    limit = Math.min(Math.max(limit, 1), 100);

    const query = {
      conversationId: conversation._id,
    };

    if (req.query.before) {
      const cursor = decodeCursor(req.query.before);

      query.$or = [
        {
          createdAt: {
            $lt: new Date(cursor.createdAt),
          },
        },
        {
          createdAt: new Date(cursor.createdAt),
          _id: {
            $lt: new mongoose.Types.ObjectId(cursor.id),
          },
        },
      ];
    }

    const messages = await Message.find(query)
      .populate("replyTo", "_id text deletedAt")
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit + 1);

    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    messages.reverse();

    const safeMessages = messages.map((message) => ({
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      text: message.deletedAt ? null : message.text,
      createdAt: message.createdAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      deletedAt: message.deletedAt,
      replyTo: message.replyTo,
    }));

    const nextCursor =
      hasMore && messages.length > 0 ? encodeCursor(messages[0]) : null;

    res.status(200).json({
      messages: safeMessages,
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
}

async function getConversations(req, res, next) {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "_id username email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      conversations,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createConversation,
  getMessages,
  getConversations,
};
