const mongoose = require("mongoose");

async function connectDatabase() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🗄️ MongoDB connected");
}

module.exports = connectDatabase;
