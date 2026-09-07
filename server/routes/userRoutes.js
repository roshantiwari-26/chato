const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { searchUsers } = require("../controllers/userControllers");

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);

module.exports = router;
