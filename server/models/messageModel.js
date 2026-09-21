const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
      required: true,
    },

    text: {
      type: String,
      trim: true,
      default: null,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    assetId: {
      type: String,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  conversationId: 1,
  createdAt: -1,
  _id: -1,
});

module.exports = mongoose.model("Message", messageSchema);
