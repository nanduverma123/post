const { GraphQLUpload } = require('graphql-upload');
const { Message: chatSchema, ClearedChat } = require("./chatSchema");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv")
dotenv.config()
const {user_token} = require("../Utils/token")
const { ApolloError } = require("apollo-server-express");
const { uploadToCloudinary } = require('../Utils/cloudinary');

// Helper function to update last message status
const updateLastMessage = async (senderId, receiverId, newMessageId) => {
  try {
    // Step 1: Find all messages between these two users
    const conversationQuery = {
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ]
    };

    // Step 2: Set all existing messages' isLastMessage to false
    await chatSchema.updateMany(
      conversationQuery,
      { isLastMessage: false }
    );

    // Step 3: Set the new message's isLastMessage to true
    await chatSchema.findByIdAndUpdate(
      newMessageId,
      { isLastMessage: true }
    );

    console.log(`✅ Updated last message status for conversation between ${senderId} and ${receiverId}`);
  } catch (error) {
    console.error("❌ Error updating last message status:", error);
    // Don't throw error to avoid breaking the main flow
  }
};

module.exports = {
  Upload: GraphQLUpload,
  Query: {
    joinvideocall: async (_, { roomID },{user}) => {
      console.log(user);
      
      try {
        const appID = process.env.APPIDV;
        const serverSecret = process.env.SERVERIDV;
        console.log(appID,serverSecret);
        
    
        if (!appID || !serverSecret) throw new ApolloError("Missing server credentials");
        if (!roomID) throw new ApolloError("Room ID is required");
    
        const userID = user.id;
        const username = user.username;
    
        // const effectiveTime = 3600; // Token valid for 1 hour
        // let currentTime = Math.floor(Date.now() / 1000);
        // let expireTime = currentTime + effectiveTime;
    
        const payloadObject = {
          room_id: roomID,
          user_id: userID,
          privilege: {
            1: 1, // Login room
            2: 1, // Publish stream
          },
          stream_id_list: null,
        };
    
        const payload = Buffer.from(JSON.stringify(payloadObject)).toString("base64");
        const nonce = crypto.randomBytes(16).toString("hex");
        const inputText = appID + userID + nonce  + payload;
    
        const hash = crypto
          .createHmac("sha256", serverSecret)
          .update(inputText)
          .digest("hex");
    
        const token = `${appID}.${userID}.${nonce}.${hash}.${payload}`;
    
        return {
          token,
          userID,
          username,
          appID,
        serverSecret
        };
    
      } 
      catch (error) {
  console.error("Error generating Zego token:", error);
  throw new ApolloError(error.message || "Failed to generate Zego token", "ZEGO_TOKEN_ERROR", {
    originalError: error,
  });
}

    },
      
   
    getMessages: async (_, { senderId, receiverId }) => {
      try {
        // Step 1: Check if sender ne chat clear kari hai
        const senderClearedChat = await ClearedChat.findOne({ 
          userId: senderId, 
          chatWithUserId: receiverId 
        });
        
        // Step 2: Build query with clearedAt filter if chat was cleared
        let messageQuery = {
          $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId },
          ],
        };
        
        // If sender ne chat clear kari hai, sirf clearedAt ke baad ke messages show karo
        if (senderClearedChat) {
          messageQuery.createdAt = { $gt: senderClearedChat.clearedAt };
        }
        
        // Step 3: Dono users ke beech messages fetch karo with filter
        const messages = await chatSchema.find(messageQuery)
        .populate('sender', 'name profileImage')
        .populate('receiver', 'name profileImage')
        .sort({ createdAt: 1 }); // Oldest to newest

        console.log(`Found ${messages.length} messages between ${senderId} and ${receiverId}`);
        
        // Format messages for GraphQL response
        const formattedMessages = messages.map(msg => ({
          id: msg._id.toString(),
          message: msg.message,
          media: msg.media,
          seen: msg.seen || false,
          isLastMessage: msg.isLastMessage || false,
          sender: {
            id: msg.sender._id.toString(),
            name: msg.sender.name,
            profileImage: msg.sender.profileImage
          },
          receiver: {
            id: msg.receiver._id.toString(),
            name: msg.receiver.name,
            profileImage: msg.receiver.profileImage
          },
          createdAt: msg.createdAt.toISOString()
        }));
        
        return formattedMessages;
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw new Error("Failed to fetch messages");
      }
    },

    getUnreadCount: async (_, { senderId, receiverId }) => {
      try {
        // Count messages sent by senderId to receiverId that are not seen
        const unreadCount = await chatSchema.countDocuments({
          sender: senderId,
          receiver: receiverId,
          seen: false
        });
        
        console.log(`Unread count for ${receiverId} from ${senderId}:`, unreadCount);
        return unreadCount;
      } catch (error) {
        console.error("Error fetching unread count:", error);
        throw new Error("Failed to fetch unread count");
      }
    },

    getLastMessages: async (_, { userId }) => {
      try {
        // Find all messages where user is either sender or receiver and isLastMessage is true
        const lastMessages = await chatSchema.find({
          $and: [
            {
              $or: [
                { sender: userId },
                { receiver: userId }
              ]
            },
            { isLastMessage: true }
          ]
        })
        .populate('sender', 'name profileImage')
        .populate('receiver', 'name profileImage')
        .sort({ createdAt: -1 }); // Most recent first

        console.log(`Found ${lastMessages.length} last messages for user ${userId}`);
        
        // Format messages for GraphQL response
        const formattedMessages = lastMessages.map(msg => ({
          id: msg._id.toString(),
          message: msg.message,
          media: msg.media,
          seen: msg.seen || false,
          isLastMessage: msg.isLastMessage || false,
          sender: {
            id: msg.sender._id.toString(),
            name: msg.sender.name,
            profileImage: msg.sender.profileImage
          },
          receiver: {
            id: msg.receiver._id.toString(),
            name: msg.receiver.name,
            profileImage: msg.receiver.profileImage
          },
          createdAt: msg.createdAt.toISOString()
        }));
        
        return formattedMessages;
      } catch (error) {
        console.error("Error fetching last messages:", error);
        throw new Error("Failed to fetch last messages");
      }
    },

    getClearedChats: async (_, { userId }) => {
      try {
        const clearedChats = await ClearedChat.find({ userId }).sort({ clearedAt: -1 });
        
        const formattedChats = clearedChats.map(chat => ({
          id: chat._id.toString(),
          userId: chat.userId.toString(),
          chatWithUserId: chat.chatWithUserId.toString(),
          clearedAt: chat.clearedAt.toISOString()
        }));
        
        console.log(`Found ${clearedChats.length} cleared chats for user ${userId}`);
        return formattedChats;
      } catch (error) {
        console.error("Error fetching cleared chats:", error);
        throw new Error("Failed to fetch cleared chats");
      }
    },

    isChatCleared: async (_, { userId, chatWithUserId }) => {
      try {
        const clearedChat = await ClearedChat.findOne({ 
          userId, 
          chatWithUserId 
        });
        
        return !!clearedChat; // return true if found, false if not
      } catch (error) {
        console.error("Error checking if chat is cleared:", error);
        throw new Error("Failed to check chat clear status");
      }
    },
  },

  Mutation: {
    sendMessage: async (_, { senderId, receiverId, message, media }, context) => {
      try {
        console.log('📤 GraphQL sendMessage called with:', {
          senderId,
          receiverId,
          message,
          media
        });
        
        const { io } = context;
        
        // Validate that either message or media is provided
        if (!message && !media) {
          throw new Error("Either message or media must be provided");
        }
        
        // Validate media object if provided
        if (media) {
          console.log('🔍 Validating media object:', media);
          if (!media.url || !media.type || !media.filename) {
            throw new Error("Media object must have url, type, and filename");
          }
        }
        
        // Step 1: Message ko MongoDB me save karo
        console.log('💾 Creating message in database...');
        console.log('📋 Message data to save:', {
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: media
        });
        
        const newMsg = await chatSchema.create({
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: media,
        });
        console.log('✅ Message created in database:', newMsg._id);

        // Update last message status for this conversation
        await updateLastMessage(senderId, receiverId, newMsg._id);

        // Step 2: Populate sender and receiver with full user data
        console.log('👥 Populating sender and receiver data...');
        const populatedMsg = await newMsg.populate([
          { path: 'sender', select: 'name profileImage' },
          { path: 'receiver', select: 'name profileImage' }
        ]);
        console.log('✅ Populated message:', {
          id: populatedMsg._id,
          sender: populatedMsg.sender,
          receiver: populatedMsg.receiver,
          media: populatedMsg.media
        });
        
        // Step 3: Format the message for GraphQL response
        const formattedMsg = {
          id: populatedMsg._id.toString(),
          message: populatedMsg.message,
          media: populatedMsg.media,
          seen: populatedMsg.seen || false,
          isLastMessage: true, // This will always be true for new messages
          sender: {
            id: populatedMsg.sender._id.toString(),
            name: populatedMsg.sender.name,
            profileImage: populatedMsg.sender.profileImage
          },
          receiver: {
            id: populatedMsg.receiver._id.toString(),
            name: populatedMsg.receiver.name,
            profileImage: populatedMsg.receiver.profileImage
          },
          createdAt: populatedMsg.createdAt.toISOString()
        };
        
        console.log('📤 Formatted message for GraphQL response:', formattedMsg);
        
        // Step 4: Real-time socket emit to both sender and receiver
        try {
          if (io) {
            // Ensure IDs are strings for socket rooms
            const receiverIdStr = receiverId.toString();
            const senderIdStr = senderId.toString();
            
            // Emit to receiver
            io.to(receiverIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to receiver:', receiverIdStr);
            
            // Also emit to sender so their temporary message gets replaced
            io.to(senderIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to sender:', senderIdStr);
          }
        } catch (socketError) {
          console.error("Error emitting socket message:", socketError);
          // Continue execution even if socket fails
        }
        
        // Step 5: Message ko GraphQL mutation response me return karo
        console.log('✅ Returning formatted message from GraphQL mutation');
        return formattedMsg;
      } catch (error) {
        console.error("❌ === GRAPHQL SEND MESSAGE ERROR ===");
        console.error("❌ Error type:", error.constructor.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Full error:", error);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ === GRAPHQL SEND MESSAGE ERROR END ===");
        throw new Error(`Failed to send message: ${error.message}`);
      }
    },
    
    sendMessageWithFile: async (_, { senderId, receiverId, message, file }, context) => {
      try {
        console.log('📤 GraphQL sendMessageWithFile called with:', {
          senderId,
          receiverId,
          message,
          hasFile: !!file
        });
        
        const { io } = context;
        
        // Validate that file is provided
        if (!file) {
          throw new Error("File must be provided for sendMessageWithFile");
        }
        
        // Get file details
        const { filename, mimetype } = await file;
        console.log('📁 File details:', { filename, mimetype });
        
        // Determine file type
        const fileType = mimetype.startsWith('image/') ? 'image' : 
                        mimetype.startsWith('video/') ? 'video' : 'auto';
        
        console.log('🔍 Detected file type:', fileType);
        
        // Upload to Cloudinary using existing utility function
        console.log('📤 Starting Cloudinary upload...');
        const uploadResult = await uploadToCloudinary(file, fileType);
        console.log('✅ File uploaded to Cloudinary:', uploadResult);
        
        // Create media object based on upload result
        let mediaData;
        if (typeof uploadResult === 'string') {
          // For images, uploadToCloudinary returns just the URL
          mediaData = {
            url: uploadResult,
            type: fileType,
            filename: filename,
            size: 0 // Size not available from string response
          };
        } else {
          // For videos, uploadToCloudinary returns an object with metadata
          mediaData = {
            url: uploadResult.url,
            type: fileType,
            filename: filename,
            size: uploadResult.bytes || 0
          };
        }
        
        console.log('📋 Media data prepared:', mediaData);
        
        // Save message to database
        console.log('💾 Creating message in database...');
        const newMsg = await chatSchema.create({
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: mediaData,
        });
        console.log('✅ Message created in database:', newMsg._id);

        // Update last message status for this conversation
        await updateLastMessage(senderId, receiverId, newMsg._id);

        // Populate sender and receiver with full user data
        console.log('👥 Populating sender and receiver data...');
        const populatedMsg = await newMsg.populate([
          { path: 'sender', select: 'name profileImage' },
          { path: 'receiver', select: 'name profileImage' }
        ]);
        
        // Format the message for GraphQL response
        const formattedMsg = {
          id: populatedMsg._id.toString(),
          message: populatedMsg.message,
          media: populatedMsg.media,
          seen: populatedMsg.seen || false,
          isLastMessage: true, // This will always be true for new messages
          sender: {
            id: populatedMsg.sender._id.toString(),
            name: populatedMsg.sender.name,
            profileImage: populatedMsg.sender.profileImage
          },
          receiver: {
            id: populatedMsg.receiver._id.toString(),
            name: populatedMsg.receiver.name,
            profileImage: populatedMsg.receiver.profileImage
          },
          createdAt: populatedMsg.createdAt.toISOString()
        };
        
        console.log('📤 Formatted message for GraphQL response:', formattedMsg);
        
        // Real-time socket emit to both sender and receiver
        try {
          if (io) {
            // Ensure IDs are strings for socket rooms
            const receiverIdStr = receiverId.toString();
            const senderIdStr = senderId.toString();
            
            // Emit to receiver
            io.to(receiverIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to receiver:', receiverIdStr);
            
            // Also emit to sender so their temporary message gets replaced
            io.to(senderIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to sender:', senderIdStr);
          }
        } catch (socketError) {
          console.error("Error emitting socket message:", socketError);
          // Continue execution even if socket fails
        }
        
        // Return formatted message
        console.log('✅ Returning formatted message from GraphQL mutation');
        return formattedMsg;
        
      } catch (error) {
        console.error("❌ === GRAPHQL SEND MESSAGE WITH FILE ERROR ===");
        console.error("❌ Error type:", error.constructor.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Full error:", error);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ === GRAPHQL SEND MESSAGE WITH FILE ERROR END ===");
        throw new Error(`Failed to send message with file: ${error.message}`);
      }
    },

    deleteMessage: async (_, { messageId }, context) => {
      try {
        const { io } = context;
        
        // Find the message first to get sender and receiver info
        const message = await chatSchema.findById(messageId).populate("sender receiver");
        
        if (!message) {
          throw new Error("Message not found");
        }
        
        // Delete the message from the database
        await chatSchema.findByIdAndDelete(messageId);
        
        // Emit socket event to notify clients about the deleted message
        if (io) {
          try {
            // Format the message ID for socket transmission
            const deleteInfo = {
              messageId: messageId,
              senderId: message.sender._id.toString(),
              receiverId: message.receiver._id.toString()
            };
            
            // Broadcast the delete event to all connected clients
            io.emit("messageDeleted", deleteInfo);
            console.log("Broadcasted message deletion to all clients:", deleteInfo);
          } catch (socketError) {
            console.error("Error emitting socket delete event:", socketError);
          }
        }
        
        return true; // Return success
      } catch (error) {
        console.error("Error deleting message:", error);
        throw new Error("Failed to delete message");
      }
    },

    markMessageAsSeen: async (_, { messageId }, context) => {
      try {
        const { io } = context;
        
        // Update the message to mark it as seen
        const updatedMessage = await chatSchema.findByIdAndUpdate(
          messageId,
          { seen: true },
          { new: true }
        ).populate('sender receiver');
        
        if (!updatedMessage) {
          throw new Error("Message not found");
        }
        
        // Emit socket event to notify sender that message was seen
        if (io) {
          try {
            const seenInfo = {
              messageId: messageId,
              senderId: updatedMessage.sender._id.toString(),
              receiverId: updatedMessage.receiver._id.toString(),
              seen: true
            };
            
            // Notify the sender that their message was seen
            io.to(updatedMessage.sender._id.toString()).emit("messageSeen", seenInfo);
            console.log("Notified sender about message seen:", seenInfo);
          } catch (socketError) {
            console.error("Error emitting socket seen event:", socketError);
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error marking message as seen:", error);
        throw new Error("Failed to mark message as seen");
      }
    },

    markAllMessagesAsSeen: async (_, { senderId, receiverId }, context) => {
      try {
        const { io } = context;
        
        // Update all unseen messages from senderId to receiverId
        const result = await chatSchema.updateMany(
          { 
            sender: senderId, 
            receiver: receiverId, 
            seen: false 
          },
          { seen: true }
        );
        
        console.log(`Marked ${result.modifiedCount} messages as seen from ${senderId} to ${receiverId}`);
        
        // Emit socket event to notify sender that all messages were seen
        if (io) {
          try {
            const seenInfo = {
              senderId: senderId,
              receiverId: receiverId,
              allMessagesSeen: true,
              count: result.modifiedCount
            };
            
            // Notify the sender that all their messages were seen
            io.to(senderId.toString()).emit("allMessagesSeen", seenInfo);
            console.log("Notified sender about all messages seen:", seenInfo);
          } catch (socketError) {
            console.error("Error emitting socket all seen event:", socketError);
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error marking all messages as seen:", error);
        throw new Error("Failed to mark all messages as seen");
      }
    },

    clearChat: async (_, { userId, chatWithUserId }, context) => {
      try {
        const { io } = context;
        
        // Check if chat is already cleared by this user
        const existingClearedChat = await ClearedChat.findOne({ 
          userId, 
          chatWithUserId 
        });
        
        if (existingClearedChat) {
          // Update the clearedAt timestamp
          await ClearedChat.findByIdAndUpdate(
            existingClearedChat._id,
            { clearedAt: new Date() }
          );
          console.log(`Updated cleared chat timestamp for user ${userId} with ${chatWithUserId}`);
        } else {
          // Create new cleared chat record
          await ClearedChat.create({
            userId,
            chatWithUserId,
            clearedAt: new Date()
          });
          console.log(`Created new cleared chat record for user ${userId} with ${chatWithUserId}`);
        }

        // Update last message status - clear isLastMessage for this conversation
        try {
          await chatSchema.updateMany(
            {
              $or: [
                { sender: userId, receiver: chatWithUserId },
                { sender: chatWithUserId, receiver: userId }
              ]
            },
            { isLastMessage: false }
          );
          console.log(`Cleared last message status for conversation between ${userId} and ${chatWithUserId}`);
        } catch (updateError) {
          console.error("Error updating last message status:", updateError);
        }
        
        // Emit socket event to notify both users about chat clear
        if (io) {
          try {
            // Get user details for better notification
            const User = require('../UserGraphQL/userSchema');
            const clearingUser = await User.findById(userId).select('name username');
            
            const clearInfo = {
              userId: userId.toString(),
              chatWithUserId: chatWithUserId.toString(),
              senderName: clearingUser?.name || 'User',
              clearedAt: new Date().toISOString()
            };
            
            // Notify the user who cleared the chat (confirmation)
            io.to(userId.toString()).emit("chatCleared", clearInfo);
            console.log("Notified clearing user about chat clear:", clearInfo);
            
            // Also notify the other user that chat was cleared by someone
            io.to(chatWithUserId.toString()).emit("chatCleared", clearInfo);
            console.log("Notified other user about chat clear:", clearInfo);
            
          } catch (socketError) {
            console.error("Error emitting socket clear event:", socketError);
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error clearing chat:", error);
        throw new Error("Failed to clear chat");
      }
    },
  },
};
