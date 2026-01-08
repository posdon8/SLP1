// models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // teacher + student
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Conversation", conversationSchema);
