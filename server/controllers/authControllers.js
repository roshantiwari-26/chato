const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../config/AppError");
const registerValidation = require("../validation/registerValidation");
const loginValidation = require("../validation/loginValidation");

async function register(req, res, next) {
  try {
    const { value, error } = registerValidation.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);
    const { email, username, password } = value;
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new AppError("Username or email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { value, error } = loginValidation.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      throw new AppError(message, 400);
    }

    const { email, password } = value;
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d", issuer: process.env.JWT_ISSUER },
    );
    res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24,
      })
      .json({
        message: "Login successful",
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie("accessToken").json({ message: "Logout successfully" });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
};
