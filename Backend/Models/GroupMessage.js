const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: { type: String },
  type: { type: String }, // e.g., "image", "video", "file", "gif"
  filename: { type: String },
  size: { type: Number }
}, { _id: false }); // prevents extra _id in subdoc

const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'video', 'audio', 'file', 'gif', 'media', 'system'], 
    default: 'text' 
  },
  media: mediaSchema, // ✅ nested media field
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupMessage' },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for better performance
groupMessageSchema.index({ group: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
