
const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const { ApolloServer } = require('apollo-server-express');
const { graphqlUploadExpress } = require('graphql-upload');
const jwt = require('jsonwebtoken');
const http = require('http'); // ✅ Required for socket.io
const { Server } = require('socket.io');

require('dotenv').config();

// DB + TypeDefs + Resolvers
const DB = require('./DB/db');
const userTypeDefs = require('./UserGraphQL/typeDefs');
const userResolvers = require('./UserGraphQL/resolvers');
const chatTypeDefs = require('./ChatGraphQL/typeDefs');
const chatResolvers = require('./ChatGraphQL/resolvers');
const videoTypeDefs = require('./VideoGraphQL/typeDefs');
const videoResolvers = require('./VideoGraphQL/resolvers');
const groupTypeDefs = require('./GroupGraphQL/typeDefs');
const groupResolvers = require('./GroupGraphQL/resolvers');
const storyTypeDefs = require('./StoryGraphQL/typeDefs');
const storyResolvers = require('./StoryGraphQL/resolvers');

// Connect DB
DB();

const app = express();

// Add timeout middleware for large uploads
app.use((req, res, next) => {
  // Set timeout for large file uploads - increased to 10 minutes
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  next();
});

// ✅ Increase Express JSON body limit for large uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));

app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// Setup multer for file uploads
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const sharp = require('sharp');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Test endpoint to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.post('/test-upload', (req, res) => {
  console.log('Test upload endpoint hit');
  res.json({ message: 'Test upload endpoint working!' });
});

// Simple test endpoint for media upload (without actual upload)
app.post('/test-media-upload', upload.single('file'), (req, res) => {
  console.log('📤 Test media upload endpoint hit');
  console.log('📁 File received:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  
  res.json({ 
    success: true, 
    message: 'Test media upload working!',
    fileReceived: !!req.file,
    fileDetails: req.file ? {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    } : null
  });
});

app.post('/upload-chat-media', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload endpoint hit');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                    req.file.mimetype.startsWith('video/') ? 'video' :
                    req.file.mimetype.startsWith('audio/') ? 'audio' : 'auto';

    console.log('🔍 Detected file type:', fileType);

    // Direct Cloudinary upload
    const uploadResult = await new Promise((resolve, reject) => {
      let uploadBuffer = req.file.buffer;
      
      // Process images with sharp
      if (fileType === 'image') {
        console.log('🖼️ Processing image with Sharp...');
        sharp(req.file.buffer)
          .resize({ width: 600, height: 800, fit: 'inside' })
          .jpeg({ quality: 70 })
          .toBuffer()
          .then(processedBuffer => {
            console.log('✅ Sharp processing successful');
            uploadBuffer = processedBuffer;
            
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'chat_media',
                format: 'jpg',
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Cloudinary image upload error:', error);
                  reject(error);
                } else {
                  console.log('✅ Cloudinary image upload success:', result.secure_url);
                  resolve(result.secure_url);
                }
              }
            );
            
            streamifier.createReadStream(uploadBuffer).pipe(uploadStream);
          })
          .catch(sharpError => {
            console.error('❌ Sharp processing error:', sharpError);
            reject(sharpError);
          });
      } else if (fileType === 'audio') {
        // For audio files, upload as video resource type (Cloudinary handles audio as video)
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // Cloudinary uses 'video' for audio files
            folder: 'chat_media',
            format: 'mp3', // Convert to mp3 for better compatibility
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary audio upload error:', error);
              reject(error);
            } else {
              console.log('✅ Audio upload success:', result.secure_url);
              resolve({
                url: result.secure_url,
                duration: result.duration || 0,
                bytes: result.bytes || req.file.size
              });
            }
          }
        );
        
        streamifier.createReadStream(uploadBuffer).pipe(uploadStream);
      } else {
        // For videos and other files, upload directly
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'chat_media',
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary error:', error);
              reject(error);
            } else {
              console.log('✅ Upload success:', result.secure_url);
              resolve({
                url: result.secure_url,
                duration: result.duration || 0,
                width: result.width || 0,
                height: result.height || 0,
                bytes: result.bytes || req.file.size
              });
            }
          }
        );
        
        streamifier.createReadStream(uploadBuffer).pipe(uploadStream);
      }
    });
    
    const mediaData = {
      url: typeof uploadResult === 'string' ? uploadResult : uploadResult.url,
      type: fileType,
      filename: req.file.originalname,
      size: req.file.size
    };

    console.log('📤 Sending response:', mediaData);
    res.json({ success: true, media: mediaData });
    
  } catch (error) {
    console.error('❌ Error uploading chat media:', error);
    res.status(500).json({ error: 'Failed to upload media', details: error.message });
  }
});

// ✅ Increase GraphQL upload limits to 500MB
app.use(graphqlUploadExpress({ 
  maxFileSize: 500*1024*1024,  // 500MB limit
  maxFiles: 2,  // Allow video + thumbnail
  maxFieldSize: 500*1024*1024  // Field size limit
}));

// Optional: GraphQL request logger
app.use('/graphql', express.json(), (req, res, next) => {
  if (req.method === 'POST') {
    console.log('📦 Incoming GraphQL Query:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Create HTTP server (for Socket.io) with increased timeout
const httpServer = http.createServer(app);

// Set server timeout for large uploads
httpServer.timeout = 600000; // 10 minutes
httpServer.keepAliveTimeout = 600000; // 10 minutes
httpServer.headersTimeout = 610000; // 10 minutes + 10 seconds

// Initialize socket.io
let io;
try {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
      credentials: true,
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });
} catch (error) {
  console.error("Error initializing Socket.io server:", error);
  // Create a dummy io object to prevent crashes
  io = {
    on: () => {},
    emit: () => {},
    to: () => ({ emit: () => {} })
  };
}

// Store `io` inside Express
app.set("io", io);

// Import User model for updating online status
const User = require('./Models/user');
const Group = require('./Models/Group');
const GroupMessage = require('./Models/GroupMessage');

// Track online users
const onlineUsers = new Map();

// Function to broadcast online users to all clients
const broadcastOnlineUsers = async () => {
  try {
    // Get all online users from database
    const dbOnlineUsers = await User.find({ isOnline: true }).select('_id');
    const dbOnlineUserIds = dbOnlineUsers.map(user => user._id.toString());
    
    // Get socket-connected users
    const socketUserIds = Array.from(onlineUsers.keys());
    
    // Use database as source of truth, but ensure all socket-connected users are included
    // This ensures consistency between what's in the database and what's broadcast
    const allOnlineUserIds = new Set([
      ...socketUserIds,
      ...dbOnlineUserIds
    ]);
    
    // Update database for any socket-connected users not marked as online
    for (const userId of socketUserIds) {
      if (!dbOnlineUserIds.includes(userId)) {
        await User.findByIdAndUpdate(userId, { 
          isOnline: true,
          lastActive: new Date()
        });
      }
    }
    
    console.log(`Broadcasting online users: ${Array.from(allOnlineUserIds)}`);
    io.emit("updateOnlineUsers", Array.from(allOnlineUserIds));
  } catch (error) {
    console.error("Error broadcasting online users:", error);
  }
};

// Periodically check and sync online users (every 5 seconds)
setInterval(async () => {
  try {
    console.log("Performing periodic online users sync...");
    
    // Get current time
    const now = new Date();
    
    // Set inactive time threshold (2 minutes)
    const inactiveThreshold = new Date(now - 2 * 60 * 1000); // 2 minutes ago
    
    // 1. Update socket-connected users to be online
    for (const userId of onlineUsers.keys()) {
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastActive: new Date()
      });
    }
    
    // 2. Set users who haven't been active for 2 minutes to offline
    // This will fix users incorrectly showing as online
    await User.updateMany(
      { 
        isOnline: true, 
        lastActive: { $lt: inactiveThreshold },
        _id: { $nin: Array.from(onlineUsers.keys()) } // Don't affect socket-connected users
      },
      { 
        isOnline: false 
      }
    );
    
    // Debug: Log all online users from database
    const dbOnlineUsers = await User.find({ isOnline: true }).select('_id name lastActive');
    console.log("Users marked as online in database:", 
      dbOnlineUsers.map(u => ({ 
        id: u._id.toString(), 
        name: u.name,
        lastActive: u.lastActive
      }))
    );
    
    // Broadcast updated online users
    broadcastOnlineUsers();
  } catch (error) {
    console.error("Error in periodic online users sync:", error);
  }
}, 5000);
// Handle socket connections
io.on("connection", (socket) => {
  try {
    console.log("⚡ Socket connected:", socket.id);
    
    // Get userId from query params (sent during connection)
    const userId = socket.handshake.query.userId;
    
    // If userId exists in the connection query
    if (userId) {
      try {
        // Store user as online
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(userId);
        
        // Update user's online status in database
        User.findByIdAndUpdate(userId, { 
          isOnline: true,
          lastActive: new Date()
        })
        .then(() => {
          console.log(`🟢 User ${userId} connected and joined room`);
          console.log(`Current online users: ${Array.from(onlineUsers.keys())}`);
          
          // Broadcast updated online users list to all clients
          broadcastOnlineUsers();
        })
        .catch(err => console.error("Error updating user online status:", err));
      } catch (error) {
        console.error("Error handling socket connection with userId:", error);
      }
    } else {
      console.log("Socket connected without userId");
    }
    
    // Handle explicit join events (when user logs in after socket connection)
    socket.on("join", (userId) => {
      if (!userId) {
        console.warn("Join event received without userId");
        return;
      }
      
      try {
        // Update socket data and room
        socket.join(userId);
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        
        // Update user's online status in database
        User.findByIdAndUpdate(userId, { 
          isOnline: true,
          lastActive: new Date()
        })
        .then(() => {
          console.log(`🟢 User explicitly joined room: ${userId}`);
          console.log(`Current online users: ${Array.from(onlineUsers.keys())}`);
          
          // Broadcast updated online users list
          broadcastOnlineUsers();
        })
        .catch(err => console.error("Error updating user online status:", err));
      } catch (error) {
        console.error("Error handling socket join:", error);
      }
    });

   socket.on("call-user", async ({ calleeID, roomID, callerID, callerName, callerImage }) => {
  const calleeSocketID = onlineUsers.get(calleeID); // ✅ Fixed here

  if (calleeSocketID) {
    try {
      // Get caller info from database if not provided
      let callerInfo = { callerName, callerImage };
      if (!callerName || !callerImage) {
        const caller = await User.findById(callerID).select('name profileImage');
        if (caller) {
          callerInfo.callerName = callerInfo.callerName || caller.name;
          callerInfo.callerImage = callerInfo.callerImage || caller.profileImage;
        }
      }

      io.to(calleeSocketID).emit("incoming-call", { 
        roomID, 
        callerID, 
        callerName: callerInfo.callerName,
        callerImage: callerInfo.callerImage
      });
      console.log(`📞 Call from ${callerID} (${callerInfo.callerName}) to ${calleeID}`);
    } catch (error) {
      console.error("Error processing call-user event:", error);
      // Fallback to basic call info
      io.to(calleeSocketID).emit("incoming-call", { roomID, callerID });
    }
  } else {
    console.log(`⚠️ Callee ${calleeID} not connected`);
  }
});

// Handle call accepted
socket.on("call-accepted", ({ callerID, roomID, calleeID }) => {
  const callerSocketID = onlineUsers.get(callerID);
  if (callerSocketID) {
    io.to(callerSocketID).emit("call-accepted", { roomID, calleeID });
    console.log(`✅ Call accepted by ${calleeID} for room ${roomID}`);
  }
});

// Handle call declined
socket.on("call-declined", ({ callerID, roomID }) => {
  const callerSocketID = onlineUsers.get(callerID);
  if (callerSocketID) {
    io.to(callerSocketID).emit("call-declined", { roomID });
    console.log(`❌ Call declined for room ${roomID}`);
  }
});

// Handle call cancelled
socket.on("call-cancelled", ({ roomID }) => {
  console.log(`🚫 Call cancelled for room ${roomID}`);
  // Notify all participants that call was cancelled
  io.emit("call-cancelled", { roomID });
});


    // Handle disconnections
    socket.on("disconnect", () => {
      try {
        console.log("❌ Socket disconnected:", socket.id);
        
        if (socket.userId) {
          console.log(`User ${socket.userId} went offline`);
          
          // Update user's offline status in database
          User.findByIdAndUpdate(socket.userId, { 
            isOnline: false,
            lastActive: new Date()
          })
          .then(() => {
            // Remove user from online list
            onlineUsers.delete(socket.userId);
            
            // Broadcast updated online users list
            broadcastOnlineUsers();
            console.log(`Updated online users: ${Array.from(onlineUsers.keys())}`);
          })
          .catch(err => console.error("Error updating user offline status:", err));
        }
      } catch (error) {
        console.error("Error handling socket disconnect:", error);
      }
    });
    
    // Handle getOnlineUsers request
    socket.on("getOnlineUsers", async () => {
      try {
        console.log("getOnlineUsers request received from client");
        // Immediately broadcast current online users to the requesting client
        broadcastOnlineUsers();
      } catch (error) {
        console.error("Error handling getOnlineUsers request:", error);
      }
    });
    
    // Handle ping event
    socket.on("ping", async () => {
      try {
        // If user is identified, update their last active time
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { 
            isOnline: true,
            lastActive: new Date()
          });
          
          // Broadcast updated online users to all clients
          broadcastOnlineUsers();
        }
      } catch (error) {
        console.error("Error handling ping:", error);
      }
    });

    // ========== GROUP CHAT SOCKET EVENTS ==========
    
    // Join group rooms
    socket.on("joinGroup", (groupId) => {
      try {
        if (groupId && socket.userId) {
          socket.join(`group_${groupId}`);
          console.log(`🏠 User ${socket.userId} joined group room: group_${groupId}`);
        }
      } catch (error) {
        console.error("Error joining group room:", error);
      }
    });

    // Leave group rooms
    socket.on("leaveGroup", (groupId) => {
      try {
        if (groupId && socket.userId) {
          socket.leave(`group_${groupId}`);
          console.log(`🚪 User ${socket.userId} left group room: group_${groupId}`);
        }
      } catch (error) {
        console.error("Error leaving group room:", error);
      }
    });

    // Handle group message typing
    socket.on("groupTyping", async ({ groupId, isTyping, userName }) => {
      try {
        if (groupId && socket.userId) {
          // Fetch the user's profile image from the database
          const user = await User.findById(socket.userId).select('profileImage');
          socket.to(`group_${groupId}`).emit("groupUserTyping", {
            userId: socket.userId,
            userName: userName || "Someone",
            profileImage: user?.profileImage || "",
            isTyping,
            groupId
          });
          console.log(`⌨️ User ${socket.userId} ${isTyping ? 'started' : 'stopped'} typing in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error handling group typing:", error);
      }
    });

    // Handle 1-on-1 message typing
    socket.on("userTyping", async ({ receiverId, isTyping, userName }) => {
      try {
        if (receiverId && socket.userId) {
          // Fetch the user's profile image from the database
          const user = await User.findById(socket.userId).select('profileImage');
          socket.to(receiverId).emit("userTypingStatus", {
            userId: socket.userId,
            userName: userName || "Someone",
            profileImage: user?.profileImage || "",
            isTyping
          });
          console.log(`⌨️ User ${socket.userId} ${isTyping ? 'started' : 'stopped'} typing to user ${receiverId}`);
        }
      } catch (error) {
        console.error("Error handling user typing:", error);
      }
    });

    // Handle group message read status
    socket.on("markGroupMessageRead", async ({ messageId, groupId }) => {
      try {
        if (messageId && groupId && socket.userId) {
          // This will be handled by GraphQL mutation, but we can emit real-time update
          socket.to(`group_${groupId}`).emit("groupMessageRead", {
            messageId,
            userId: socket.userId,
            readAt: new Date()
          });
          console.log(`📖 User ${socket.userId} read message ${messageId} in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error handling group message read:", error);
      }
    });

    // Handle group member online status
    socket.on("getGroupMembersStatus", async (groupId) => {
      try {
        if (groupId && socket.userId) {
          const Group = require('./Models/Group');
          const group = await Group.findById(groupId).populate('members', '_id isOnline lastActive');
          
          if (group && group.members.some(member => member._id.toString() === socket.userId)) {
            const membersStatus = group.members.map(member => ({
              userId: member._id,
              isOnline: member.isOnline,
              lastActive: member.lastActive
            }));
            
            socket.emit("groupMembersStatus", {
              groupId,
              membersStatus
            });
          }
        }
      } catch (error) {
        console.error("Error getting group members status:", error);
      }
    });

    // Handle group voice/video call events
    socket.on("startGroupCall", ({ groupId, callType, roomId }) => {
      try {
        if (groupId && socket.userId) {
          socket.to(`group_${groupId}`).emit("groupCallStarted", {
            callerId: socket.userId,
            groupId,
            callType, // 'voice' or 'video'
            roomId
          });
          console.log(`📞 User ${socket.userId} started ${callType} call in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error starting group call:", error);
      }
    });

    socket.on("joinGroupCall", ({ groupId, roomId }) => {
      try {
        if (groupId && socket.userId) {
          socket.to(`group_${groupId}`).emit("userJoinedGroupCall", {
            userId: socket.userId,
            groupId,
            roomId
          });
          console.log(`📞 User ${socket.userId} joined group call in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error joining group call:", error);
      }
    });

    socket.on("leaveGroupCall", ({ groupId, roomId }) => {
      try {
        if (groupId && socket.userId) {
          socket.to(`group_${groupId}`).emit("userLeftGroupCall", {
            userId: socket.userId,
            groupId,
            roomId
          });
          console.log(`📞 User ${socket.userId} left group call in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error leaving group call:", error);
      }
    });

    socket.on("endGroupCall", ({ groupId, roomId }) => {
      try {
        if (groupId && socket.userId) {
          socket.to(`group_${groupId}`).emit("groupCallEnded", {
            endedBy: socket.userId,
            groupId,
            roomId
          });
          console.log(`📞 User ${socket.userId} ended group call in group ${groupId}`);
        }
      } catch (error) {
        console.error("Error ending group call:", error);
      }
    });

    // Handle share notifications
    socket.on("shareNotification", (shareData) => {
      try {
        const { receiverId, senderName, senderProfileImage, contentType, message, timestamp } = shareData;
        
        if (receiverId) {
          // Send notification to the specific receiver
          io.to(receiverId).emit("shareNotification", {
            senderName,
            senderProfileImage,
            contentType,
            message,
            timestamp
          });
          
          console.log(`📤 Share notification sent from ${senderName} to ${receiverId} for ${contentType}`);
        }
      } catch (error) {
        console.error("Error handling share notification:", error);
      }
    });

    // Handle chat order updates
    socket.on("updateChatOrder", (data) => {
      try {
        const { receiverId, senderId, senderName, contentType, timestamp } = data;
        
        if (receiverId) {
          // Send chat order update to the specific receiver
          io.to(receiverId).emit("updateChatOrder", {
            senderId,
            senderName,
            contentType,
            timestamp
          });
          
          console.log(`📋 Chat order update sent to ${receiverId} for sender ${senderName}`);
        }
      } catch (error) {
        console.error("Error handling chat order update:", error);
      }
    });


  } catch (error) {
    console.error("Error in socket connection handler:", error);
  }
});

// Start Apollo Server
async function startServer() {
  const server = new ApolloServer({
    typeDefs: [userTypeDefs, chatTypeDefs, videoTypeDefs, groupTypeDefs,storyTypeDefs],
    resolvers: [userResolvers, chatResolvers, videoResolvers, groupResolvers,storyResolvers],
    uploads: false, // ✅ Yeh likhna zaroori hai if using graphqlUploadExpress()
    context: ({ req, res }) => {
      const io = req.app.get("io");
      
      // Check for token in cookies first (for Apollo Client)
      let token = req.cookies.token;
      let tokenSource = 'cookie';
      
      // If no cookie token, check Authorization header (for direct fetch calls)
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remove 'Bearer ' prefix
          tokenSource = 'header';
        }
      }
      
      console.log('🔍 GraphQL Context - Token source:', tokenSource, 'Token present:', !!token);
  
      if (!token) {
        console.log('❌ No token found in cookies or Authorization header');
        return { req, res, io };
      }
  
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ User authenticated via', tokenSource, ':', { id: user.id, name: user.name });
        return { req, res, user, io };
      } catch (err) {
        console.log('❌ Token verification failed:', err.message);
        return { req, res, io };
      }
    },
    // Add timeout configuration
    formatError: (err) => {
      console.error('GraphQL Error:', err);
      return err;
    },
    // Increase timeout for large operations
    playground: {
      settings: {
        'request.credentials': 'include',
      },
    },
  });

  await server.start();

  server.applyMiddleware({
    app,
    cors: {
      origin: 'http://localhost:3000',
      credentials: true,
    },
    // Add timeout for middleware
    bodyParserConfig: {
      limit: '500mb',
      timeout: 600000, // 10 minutes
    },
  });

   app.get('/', (req, res) => {
    res.send('🚀 Server is running...');
  });
  
  // Debug route to test unread counts
  app.get('/debug/unread-counts/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const GroupMessage = require('./Models/GroupMessage');
      const Group = require('./Models/Group');
      
      // Get user's groups
      const userGroups = await Group.find({ members: userId }).select('_id name');
      
      const results = {};
      for (const group of userGroups) {
        const query = {
          group: group._id,
          isDeleted: false,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId }
        };
        
        const count = await GroupMessage.countDocuments(query);
        const sampleMessages = await GroupMessage.find(query).limit(3).populate('sender', 'name').populate('readBy.user', 'name');
        
        results[group.name] = {
          count,
          sampleMessages: sampleMessages.map(msg => ({
            id: msg._id,
            content: msg.content?.substring(0, 50),
            sender: msg.sender.name,
            readBy: msg.readBy.map(r => r.user.name)
          }))
        };
      }
      
      res.json({ userId, results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug route to check online users
  app.get('/debug/online-users', async (req, res) => {
    try {
      // Get socket-connected users
      const socketUsers = Array.from(onlineUsers.keys());
      
      // Get database online users
      const dbOnlineUsers = await User.find({ isOnline: true }).select('_id name lastActive');
      const dbOnlineUserIds = dbOnlineUsers.map(u => u._id.toString());
      
      // Force update all socket-connected users
      for (const userId of socketUsers) {
        await User.findByIdAndUpdate(userId, { 
          isOnline: true,
          lastActive: new Date()
        });
      }
      
      // Broadcast updated online users
      broadcastOnlineUsers();
      
      res.json({
        socketConnectedUsers: socketUsers,
        databaseOnlineUsers: dbOnlineUsers.map(u => ({ 
          id: u._id.toString(), 
          name: u.name,
          lastActive: u.lastActive
        })),
        allOnlineUsers: Array.from(new Set([...socketUsers, ...dbOnlineUserIds]))
      });
    } catch (error) {
      console.error("Error in debug route:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Route to manually clean up stale online statuses
  app.get('/debug/cleanup-online-status', async (req, res) => {
    try {
      // Get current time
      const now = new Date();
      
      // Set inactive time threshold (5 minutes)
      const inactiveThreshold = new Date(now - 5 * 60 * 1000); // 5 minutes ago
      
      // Find users who are marked as online but haven't been active recently
      const staleUsers = await User.find({
        isOnline: true,
        lastActive: { $lt: inactiveThreshold },
        _id: { $nin: Array.from(onlineUsers.keys()) } // Don't affect socket-connected users
      }).select('_id name lastActive');
      
      // Update these users to be offline
      const updateResult = await User.updateMany(
        { 
          isOnline: true, 
          lastActive: { $lt: inactiveThreshold },
          _id: { $nin: Array.from(onlineUsers.keys()) }
        },
        { isOnline: false }
      );
      
      // Broadcast updated online users
      broadcastOnlineUsers();
      
      res.json({
        message: "Cleaned up stale online statuses",
        staleUsers: staleUsers.map(u => ({ 
          id: u._id.toString(), 
          name: u.name,
          lastActive: u.lastActive,
          inactiveFor: Math.round((now - u.lastActive) / 1000 / 60) + " minutes"
        })),
        updateResult
      });
    } catch (error) {
      console.error("Error cleaning up online status:", error);
      res.status(500).json({ error: error.message });
    }
  });



  httpServer.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Apollo GraphQL running at http://localhost:5000${server.graphqlPath}`);
    console.log(`🔌 Socket.io running on same server`);
  });
}

startServer();

