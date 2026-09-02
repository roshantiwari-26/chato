const mongoose = require("mongoose");

async function connectDatabase() {
  await mongoose.connect("mongodb://localhost:27017/chato");
  console.log("🗄️ MongoDB connected");
}

module.exports = connectDatabase;
