const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  url: { type: String },
  type: { type: String }, // e.g., "image", "video", "file"
  filename: { type: String },
  size: { type: Number }
}, { _id: false }); // prevents extra _id in subdoc

const clearedChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // jo user ne chat clear kari hai
  chatWithUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // jisse chat kar rha hai uski id
  clearedAt: { type: Date, default: Date.now } // jab chat clear kari tab ka datetime
});

const chatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String },
  media: mediaSchema, // ✅ nested media field
  seen: { type: Boolean, default: false }, // ✅ seen field for message status
  isLastMessage: { type: Boolean, default: false }, // ✅ field to track last message in conversation
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", chatSchema);
const ClearedChat = mongoose.model("ClearedChat", clearedChatSchema);

module.exports = { Message, ClearedChat };
