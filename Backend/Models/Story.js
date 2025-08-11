const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: { type: String, required: true },
  avatar: { type: String, required: true },
  mediaType: { type: String, enum: ["image", "video", null] },
  mediaUrl: { type: String },
  caption: { type: String },
  location: { type: String },
  viewers: [{ type: String }],
  createdAt: { type: String, required: true },
  expiresAt: { type: String, required: true },
});

module.exports = mongoose.model("Story", storySchema);
