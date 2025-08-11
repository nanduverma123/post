const Story = require("../Models/Story");
const User = require("../Models/user");
const { uploadToCloudinary } = require("../Utils/cloudinary");
const mongoose = require("mongoose");

module.exports = {
  // Map reply.userId -> GraphQL field id
  StoryReply: {
    id: (reply) => (reply && (reply.userId || reply.id))
  },
  Query: {
    getStories: async (_, { userId }) => {
      try {
        return await Story.find({ userId }).sort({ createdAt: -1 });
      } catch (err) {
        console.error("Error fetching stories:", err);
        throw new Error("Failed to fetch stories");
      }
    },

    getStoryById: async (_, { id }) => {
      try {
        const story = await Story.findById(id);
        if (!story) throw new Error("Story not found");
        return story;
      } catch (error) {
        console.error("Error fetching story:", error);
        throw new Error("Failed to fetch story");
      }
    },

    getUserStories: async (_, { userId }) => {
      try {
        console.log(`🔍 getUserStories called for userId: ${userId}`);
        
        // Validate userId
        if (!userId) {
          console.error('❌ No userId provided');
          return [];
        }

        // Check database connection
        if (!mongoose.connection.readyState) {
          console.error('❌ Database not connected');
          throw new Error("Database connection error");
        }

        // Debug: Check total stories in database
        const totalStories = await Story.countDocuments();
        console.log(`🔍 Total stories in database: ${totalStories}`);
        
        const now = new Date();
        
        // Find all stories for user and filter out expired ones
        const allStories = await Story.find({ userId }).sort({ createdAt: -1 });
        console.log(`📊 Found ${allStories.length} total stories for user ${userId}`);
        
        // Filter active stories (not expired)
        const activeStories = allStories.filter(story => {
          try {
            const expiresAt = new Date(story.expiresAt);
            const isActive = expiresAt > now;
            
            if (!isActive) {
              console.log(`⏰ Story ${story._id} expired at ${story.expiresAt}`);
            }
            
            return isActive;
          } catch (dateError) {
            console.warn(`⚠️ Invalid date for story ${story._id}:`, dateError);
            return false; // Consider invalid date stories as expired
          }
        });
        
        console.log(`✅ Found ${activeStories.length} active stories for user ${userId}`);
        
        if (activeStories.length > 0) {
          console.log(`📝 Sample active story:`, {
            id: activeStories[0]._id,
            userId: activeStories[0].userId,
            username: activeStories[0].username,
            mediaType: activeStories[0].mediaType,
            createdAt: activeStories[0].createdAt,
            expiresAt: activeStories[0].expiresAt,
            timeLeft: Math.round((new Date(activeStories[0].expiresAt) - now) / (1000 * 60 * 60)) + ' hours'
          });
        }
        
        // Clean up expired stories from database (async, don't wait)
        const expiredStories = allStories.filter(story => {
          try {
            return new Date(story.expiresAt) <= now;
          } catch {
            return true; // Delete stories with invalid dates
          }
        });
        
        if (expiredStories.length > 0) {
          console.log(`🗑️ Cleaning up ${expiredStories.length} expired stories`);
          // Don't await this - let it run in background
          Story.deleteMany({
            _id: { $in: expiredStories.map(s => s._id) }
          }).catch(err => console.error('Error cleaning expired stories:', err));
        }
        
        return activeStories;
      } catch (error) {
        console.error("❌ Error in getUserStories:", error);
        console.error("Stack trace:", error.stack);
        
        // Return empty array instead of throwing error to prevent frontend crashes
        return [];
      }
    },
  },

  Mutation: {
    uploadStoryMedia: async (_, { file }, { user }) => {
      if (!user) throw new Error("Authentication required");

      try {
        const mediaUrl = await uploadToCloudinary(file); // Assumes function returns URL
        return mediaUrl;
      } catch (error) {
        console.error("Upload error:", error);
        throw new Error("Media upload failed");
      }
    },

    addStory: async (
      _,
      { userId, username, avatar, mediaType, mediaUrl, caption, location }
    ) => {
      try {
        if (!caption && !mediaUrl) {
          throw new Error("Story must have either text or media.");
        }

        // Check daily story limit (20 stories per day)
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const todayStoriesCount = await Story.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: {
            $gte: startOfDay.toISOString(),
            $lt: endOfDay.toISOString()
          }
        });

        console.log(`📊 User ${username} has uploaded ${todayStoriesCount} stories today`);

        if (todayStoriesCount >= 20) {
          console.log(`🚫 Daily story limit reached for user ${username}`);
          throw new Error("Daily story limit reached. You can only upload 20 stories per day.");
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hrs

        const story = new Story({
          userId: new mongoose.Types.ObjectId(userId),
          username,
          avatar,
          mediaType: mediaType || null,
          mediaUrl: mediaUrl || null,
          caption: caption || null,
          location: location || null,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          viewers: [],
          replies: [{ userId: null, message: null, repliedAt: null }],
        });

        const savedStory = await story.save();
        console.log(`✅ Story saved successfully. User now has ${todayStoriesCount + 1} stories today`);
        
        return savedStory;
      } catch (error) {
        console.error("Error adding story:", error);
        throw new Error(error.message);
      }
    },

    viewStory: async (_, { statusId, userId }, { io }) => {
      try {
        const story = await Story.findById(statusId);
        if (!story) throw new Error("Story not found");

        let updated = false;

        if (!story.viewers.includes(userId)) {
          story.viewers.push(userId);
          await story.save();
          updated = true;
        }

        const updatedStory = await Story.findById(statusId);

        if (updated && io) {
          io.emit("status", updatedStory);
        }

        return [updatedStory];
      } catch (err) {
        console.error("View story error:", err);
        throw new Error("Failed to view story");
      }
    },

    deleteStory: async (_, { statusId, userId }) => {
      try {
        if (!statusId || !userId) {
          throw new Error("statusId or userId is missing");
        }

        const story = await Story.findById(statusId);
        if (!story) {
          throw new Error("Story not found");
        }

        if (story.userId.toString() !== userId) {
          throw new Error("You are not authorized to delete this story");
        }

        await story.deleteOne();

        return "Story deleted successfully"; // You can also return a message like "Story deleted"
      } catch (err) {
        console.error("Delete story error:", err);
        throw new Error(err.message);
      }
    },

    replyToStory: async (_, { storyId, userId, message }) => {
      try {
        if (!storyId || !userId || !message) {
          throw new Error("storyId, userId and message are required");
        }

        const story = await Story.findById(storyId);
        if (!story) throw new Error("Story not found");

        // Ensure array
        const existingReplies = Array.isArray(story.replies) ? story.replies : [];

        // Find a placeholder like { userId: null, message: null } or legacy { id: null, message: null }
        const placeholderIndex = existingReplies.findIndex(r => r && (r.userId == null || r.id == null) && (r.message == null || r.message === ''));

        if (placeholderIndex >= 0) {
          // Update in-place
          const placeholder = story.replies[placeholderIndex];
          if (placeholder) {
            placeholder.userId = new mongoose.Types.ObjectId(userId);
            if (typeof placeholder.id !== 'undefined') {
              // Normalize legacy field away
              try { delete placeholder.id; } catch (_) {}
            }
            placeholder.message = message;
            placeholder.repliedAt = new Date().toISOString();
            story.markModified('replies');
          }
        } else {
          // No placeholder found, append new reply
          existingReplies.push({ userId: new mongoose.Types.ObjectId(userId), message, repliedAt: new Date().toISOString() });
          story.replies = existingReplies;
        }

        await story.save();

        // Return the latest document
        return await Story.findById(storyId);
      } catch (err) {
        console.error("Reply to story error:", err);
        throw new Error(err.message || "Failed to reply to story");
      }
    },
  },
};

