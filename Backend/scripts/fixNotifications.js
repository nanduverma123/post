const mongoose = require('mongoose');
const Notification = require('../Models/Notification');
const Post = require('../Models/Post');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);

async function fixNotifications() {
  try {
    console.log('🔧 Starting notification fix...');
    
    // Find all comment notifications without commentId
    const brokenNotifications = await Notification.find({
      type: 'comment',
      commentId: { $exists: false }
    }).populate('post');
    
    console.log(`Found ${brokenNotifications.length} notifications to fix`);
    
    let fixedCount = 0;
    
    for (const notification of brokenNotifications) {
      try {
        if (!notification.post || !notification.commentText) {
          console.log(`⚠️ Skipping notification ${notification._id} - missing post or commentText`);
          continue;
        }
        
        // Find the post and look for a comment with matching text
        const post = await Post.findById(notification.post._id);
        if (!post) {
          console.log(`⚠️ Post not found for notification ${notification._id}`);
          continue;
        }
        
        // Find comment by matching text and sender
        const matchingComment = post.comments.find(comment => 
          comment.text === notification.commentText && 
          comment.user.toString() === notification.sender.toString()
        );
        
        if (matchingComment) {
          // Update notification with commentId
          await Notification.findByIdAndUpdate(notification._id, {
            commentId: matchingComment._id
          });
          
          console.log(`✅ Fixed notification ${notification._id} - added commentId ${matchingComment._id}`);
          fixedCount++;
        } else {
          console.log(`⚠️ Could not find matching comment for notification ${notification._id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing notification ${notification._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} out of ${brokenNotifications.length} notifications`);
    
  } catch (error) {
    console.error('❌ Error in fixNotifications:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixNotifications();