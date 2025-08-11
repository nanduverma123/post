const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./Models/user');
const Post = require('./Models/Post');
const Notification = require('./Models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social_media', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createTestNotifications = async () => {
  try {
    console.log('Creating test notifications...');
    
    // Get all users
    const users = await User.find().limit(5);
    console.log(`Found ${users.length} users`);
    
    if (users.length < 2) {
      console.log('Need at least 2 users to create test notifications');
      return;
    }
    
    // Get all posts
    const posts = await Post.find().limit(3);
    console.log(`Found ${posts.length} posts`);
    
    const recipient = users[0]; // First user receives notifications
    console.log(`Creating notifications for user: ${recipient.name} (${recipient._id})`);
    
    const testNotifications = [];
    
    // Create like notifications
    for (let i = 1; i < Math.min(users.length, 4); i++) {
      const sender = users[i];
      const post = posts[i % Math.max(posts.length, 1)];
      
      const likeNotification = {
        recipient: recipient._id,
        sender: sender._id,
        type: 'like',
        message: 'liked your post',
        post: post ? post._id : null,
        isRead: false,
        createdAt: new Date(Date.now() - (i * 60000)) // Stagger times
      };
      
      testNotifications.push(likeNotification);
      console.log(`Created like notification from ${sender.name}`);
    }
    
    // Create comment notifications
    for (let i = 1; i < Math.min(users.length, 3); i++) {
      const sender = users[i];
      const post = posts[i % Math.max(posts.length, 1)];
      
      const commentNotification = {
        recipient: recipient._id,
        sender: sender._id,
        type: 'comment',
        message: 'commented on your post',
        post: post ? post._id : null,
        commentText: `Great post! This is comment ${i}`,
        isRead: false,
        createdAt: new Date(Date.now() - ((i + 3) * 60000)) // Stagger times
      };
      
      testNotifications.push(commentNotification);
      console.log(`Created comment notification from ${sender.name}`);
    }
    
    // Create follow notifications
    for (let i = 1; i < Math.min(users.length, 3); i++) {
      const sender = users[i];
      
      const followNotification = {
        recipient: recipient._id,
        sender: sender._id,
        type: 'follow',
        message: 'started following you',
        isRead: false,
        createdAt: new Date(Date.now() - ((i + 5) * 60000)) // Stagger times
      };
      
      testNotifications.push(followNotification);
      console.log(`Created follow notification from ${sender.name}`);
    }
    
    // Clear existing notifications for this user
    await Notification.deleteMany({ recipient: recipient._id });
    console.log('Cleared existing notifications');
    
    // Insert new notifications
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`✅ Created ${createdNotifications.length} test notifications`);
    
    // Update unread count for recipient
    const unreadCount = testNotifications.filter(n => 
      n.type === 'like' || n.type === 'comment' || n.type === 'comment_like'
    ).length;
    
    await User.findByIdAndUpdate(recipient._id, {
      unreadNotifications: unreadCount
    });
    
    console.log(`✅ Updated unread count to ${unreadCount} for user ${recipient.name}`);
    
    // Display created notifications
    console.log('\n📋 Created notifications:');
    createdNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.type} - ${notification.message}`);
    });
    
    console.log('\n🎉 Test notifications created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
createTestNotifications();