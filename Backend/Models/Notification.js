const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['like', 'comment', 'comment_like', 'reply', 'reply_like', 'reel_like', 'reel_comment', 'follow', 'mention']
  },
  message: {
    type: String,
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false
  },
  reel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: false
  },
  commentText: {
    type: String,
    required: false
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);