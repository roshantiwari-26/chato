const User = require("../models/userModel");
const AppError = require("../config/AppError");

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      throw new AppError("Search query is required", 400);
    }

    const searchQuery = q.trim();

    const users = await User.find({
      _id: {
        $ne: req.user.userId,
      },
      $or: [
        {
          username: {
            $regex: searchQuery,
            $options: "i",
          },
        },
        {
          email: {
            $regex: searchQuery,
            $options: "i",
          },
        },
      ],
    })
      .select("_id username email")
      .limit(10);

    res.status(200).json({
      users,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchUsers,
};
