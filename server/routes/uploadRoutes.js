const express = require("express");

const router = express.Router();

const { uploadImage } = require("../controllers/uploadController");

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.post("/image", authMiddleware, upload.single("image"), uploadImage);

module.exports = router;
