const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  me,
} = require("../controllers/authControllers");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);

module.exports = router;
