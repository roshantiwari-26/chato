const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const {
  getMessages,
  getConversations,
} = require("../controllers/conversationControllers");

const router = express.Router();

router.get("/", authMiddleware, getConversations);
router.get("/:conversationId/messages", authMiddleware, getMessages);

module.exports = router;
