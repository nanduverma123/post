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
  replies: [
    {
      _id: false,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message: { type: String },
      repliedAt: { type: String },
    },
  ],
  createdAt: { type: String, required: true },
  expiresAt: { type: String, required: true },
});

// Add viewer once - idempotent helper for use across resolvers/routes
storySchema.statics.addViewer = async function addViewerOnce(storyId, userId) {
  if (!storyId || !userId) {
    throw new Error("storyId and userId are required");
  }
  // viewers are stored as strings in schema
  const viewerIdAsString = String(userId);
  return this.findByIdAndUpdate(
    storyId,
    { $addToSet: { viewers: viewerIdAsString } },
    { new: true }
  );
};

module.exports = mongoose.model("Story", storySchema);
