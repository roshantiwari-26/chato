const jwt = require("jsonwebtoken");
const AppError = require("../config/AppError");

function authMiddleware(req, res, next) {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      throw new AppError("Authentication required", 401);
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
    });

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
