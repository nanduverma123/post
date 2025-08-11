import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import EmojiMessageInput from "./EmojiMessageInput.js"; // path adjust karo
import { GetTokenFromCookie, GetRawTokenFromCookie } from '../getToken/GetToken';
import socket from "../socket_io/Socket";
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import GroupChat from './GroupChat';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER_GROUPS, SEND_MESSAGE, SEND_MESSAGE_WITH_FILE, DELETE_MESSAGE, GET_MESSAGES, GET_ALL_USERS, GET_GROUP_UNREAD_COUNT, MARK_GROUP_MESSAGE_AS_READ, GET_UNREAD_COUNT, MARK_ALL_MESSAGES_AS_SEEN, GET_LAST_MESSAGES, CLEAR_CHAT } from '../../graphql/mutations';
import GifSelector from './GifPicker';
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import { X, Mic, MicOff, Square, Play, Pause, FileText, Image, Video } from "lucide-react";
import SharedContent from './SharedContent';
import { useChat } from '../../context/ChatContext';

const ChatList = ({ activeTab, createdGroups }) => {
  const [users, setUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const { chatOrder, updateChatOrder } = useChat();
  const [messages, setMessages] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sender, setSender] = useState();
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showAttachmentBar, setShowAttachmentBar] = useState(false);
  const attachmentBarRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const gifPickerRef = useRef(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null);
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [touchTimer, setTouchTimer] = useState(null);
  const [mobileMenuMsgId, setMobileMenuMsgId] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});
  const [userUnreadCounts, setUserUnreadCounts] = useState({});
  const [removedGroupIds, setRemovedGroupIds] = useState(new Set());
  const [lastMessages, setLastMessages] = useState({});
  
  // Typing indicator states for 1-on-1 chats
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recordingTimerRef = useRef(null);
  const [recordedAudio, setRecordedAudio] = useState(null); // For audio preview
  const [audioMessage, setAudioMessage] = useState(""); // For message with audio
  
  // Audio playback states
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioDuration, setAudioDuration] = useState({});
  const [audioProgress, setAudioProgress] = useState({});
  const audioRefs = useRef({});
  const messagesEndRef = useRef(null);
  
  const navigate = useNavigate();

  const sampleMessages = {
    1: [
      { id: 1, text: "Hey, how are you?", sender: "them", time: "10:30 AM" },
      { id: 2, text: "I'm good, thanks! How about you?", sender: "me", time: "10:31 AM" },
    ],
    2: [
      { id: 1, text: "See you tomorrow!", sender: "them", time: "9:45 AM" },
      { id: 2, text: "Yes, looking forward to it!", sender: "me", time: "9:46 AM" }
    ]
  };

  useEffect(() => {
    try {
      const decodedUser = GetTokenFromCookie(); // JWT se user decode
      if (decodedUser?.id) {
        // Ensure ID is always a string
        const userId = decodedUser.id.toString();
        console.log("User authenticated with ID:", userId);
        
        // Set sender with string ID
        setSender({ ...decodedUser, id: userId });
        
        // Join socket room with string user ID
        if (socket.connected) {
          console.log("Socket connected, joining room:", userId);
          socket.emit("join", userId);
        } else {
          console.log("Socket not connected yet, will join on connect");
        }
        
        // Setup reconnection handler
        const handleReconnect = () => {
          console.log("Socket reconnected, rejoining room with ID:", userId);
          socket.emit("join", userId);
          
          // Request updated online users list
          setTimeout(() => {
            socket.emit("getOnlineUsers");
          }, 500);
        };
        
        // Register connect handler
        socket.on("connect", handleReconnect);
        
        // Cleanup
        return () => {
          socket.off("connect", handleReconnect);
        };
      } else {
        console.warn("No user ID found in token");
      }
    } catch (error) {
      console.error("Error decoding token or joining socket:", error);
    }
  }, []);

  // Separate useEffect for socket events to avoid dependency issues
  useEffect(() => {
    // Handle online users updates
    const handleOnlineUsersUpdate = (users) => {
      try {
        // Convert all user IDs to strings for consistent comparison
        const stringifiedUsers = users.map(id => id.toString());
        console.log("Online users received from server:", stringifiedUsers);
        
        // Create a new Set with string IDs for consistent comparison
        const onlineSet = new Set(stringifiedUsers);
        
        // Update the online users state
        setOnlineUsers(prevOnlineUsers => {
          // Create a new Set to avoid direct mutation
          const newOnlineUsers = new Set(prevOnlineUsers);
          
          // Add newly online users
          for (const userId of stringifiedUsers) {
            if (!prevOnlineUsers.has(userId)) {
              console.log(`User ${userId} is now online`);
              newOnlineUsers.add(userId);
            }
          }
          
          // Remove users who went offline
          for (const userId of prevOnlineUsers) {
            if (!stringifiedUsers.includes(userId)) {
              console.log(`User ${userId} is now offline`);
              newOnlineUsers.delete(userId);
            }
          }
          
          return newOnlineUsers;
        });
        
        // Update the users list with the latest online status
        setTimeout(() => {
          updateUsersOnlineStatus();
        }, 100);
        
        // Debug log
        console.log("Online users updated. Current user:", sender?.id);
        console.log("Is current user online:", onlineSet.has(sender?.id?.toString()));
      } catch (error) {
        console.error("Error handling online users update:", error);
      }
    };
    
    // Handle socket reconnection
    const handleReconnect = () => {
      try {
        console.log("Socket reconnected, refreshing online users");
        // When reconnected, re-join the room with string ID
        if (sender?.id) {
          const userId = sender.id.toString();
          console.log("Rejoining room with ID:", userId);
          socket.emit("join", userId);
          
          // Request updated online users list after reconnection
          console.log("Requesting updated online users list");
          setTimeout(() => {
            socket.emit("getOnlineUsers");
          }, 500); // Small delay to ensure server has processed the join event
        }
      } catch (error) {
        console.error("Error handling socket reconnection:", error);
      }
    };

    // Handle chat cleared event
    const handleChatCleared = (data) => {
      try {
        console.log("Chat cleared event received:", data);
        const { userId, chatWithUserId, senderName } = data;
        
        // If someone cleared the chat with current user
        if (chatWithUserId === sender?.id?.toString() && userId !== sender?.id?.toString()) {
          console.log(`${senderName} cleared chat with you, clearing local messages`);
          
          // If this is the currently selected chat, clear messages
          if (selectedChat?.id?.toString() === userId) {
            setMessages([]);
            
            // Show notification to user
            alert(`${senderName} cleared the chat`);
          }
          
          // Update last messages to remove this conversation
          setLastMessages(prev => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
          
          // Refetch last messages to ensure consistency
          if (refetchLastMessages) {
            setTimeout(() => {
              refetchLastMessages();
            }, 500);
          }
        }
        
        // If current user cleared the chat (confirmation from server)
        if (userId === sender?.id?.toString() && chatWithUserId === selectedChat?.id?.toString()) {
          console.log("Server confirmed: Current user cleared this chat");
          setMessages([]);
          
          // Update last messages
          setLastMessages(prev => {
            const updated = { ...prev };
            delete updated[chatWithUserId];
            return updated;
          });
        }
      } catch (error) {
        console.error("Error handling chat cleared event:", error);
      }
    };

    // Register event handlers
    socket.on("updateOnlineUsers", handleOnlineUsersUpdate);
    socket.on("connect", handleReconnect);
    socket.on("chatCleared", handleChatCleared);

    // Request current online users on mount
    if (socket.connected) {
      console.log("Socket already connected, requesting online users");
      socket.emit("getOnlineUsers");
    }

    // Set up polling for online users every 5 seconds
    const onlineUsersPollingInterval = setInterval(() => {
      if (socket.connected) {
        console.log("Polling for online users");
        socket.emit("getOnlineUsers");
      }
    }, 5000);

    return () => {
      socket.off("updateOnlineUsers", handleOnlineUsersUpdate);
      socket.off("connect", handleReconnect);
      socket.off("chatCleared", handleChatCleared);
      clearInterval(onlineUsersPollingInterval);
    };
  }, [sender?.id]);



  // Apollo queries
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_ALL_USERS);
  
  const { data: groupsData, loading: groupsLoading, refetch: refetchGroups } = useQuery(GET_USER_GROUPS, {
    variables: { userId: sender?.id },
    skip: !sender?.id
  });

  // Removed GET_REMOVED_GROUPS query - using real-time socket events instead

  const { data: messagesData, loading: messagesLoading, refetch: refetchMessages } = useQuery(GET_MESSAGES, {
    variables: { 
      senderId: sender?.id, 
      receiverId: selectedChat?.id 
    },
    skip: !sender?.id || !selectedChat?.id
  });

  const { data: lastMessagesData, loading: lastMessagesLoading, refetch: refetchLastMessages } = useQuery(GET_LAST_MESSAGES, {
    variables: { userId: sender?.id },
    skip: !sender?.id
  });

  // Apollo mutations
  const [sendMessageMutation] = useMutation(SEND_MESSAGE);
  const [markGroupMessageAsRead] = useMutation(MARK_GROUP_MESSAGE_AS_READ);
  const [sendMessageWithFileMutation] = useMutation(SEND_MESSAGE_WITH_FILE);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE);
  const [markAllMessagesAsSeenMutation] = useMutation(MARK_ALL_MESSAGES_AS_SEEN);
  const [clearChatMutation] = useMutation(CLEAR_CHAT);

  // Socket listener for removed from group
  useEffect(() => {
    const handleRemovedFromGroup = ({ groupId, groupName, message }) => {
      console.log('🚨 User removed from group:', { groupId, groupName, message });
      // Add to removed groups set to hide from list
      setRemovedGroupIds(prev => new Set([...prev, groupId]));
    };

    const handleGroupListRemovalNotification = ({ groupId, groupName, message, isRemoved }) => {
      console.log('📋 Group list removal notification:', { groupId, groupName, message, isRemoved });
      // Add to removed groups set to hide from list
      setRemovedGroupIds(prev => new Set([...prev, groupId]));
    };

    // Socket listener for chat order updates from other users
    const handleChatOrderUpdate = ({ senderId, senderName }) => {
      console.log('📬 Received chat order update from:', senderName, 'ID:', senderId);
      // Update chat order to move the sender to top of this user's chat list
      updateChatOrder(senderId);
    };

    socket.on("removedFromGroup", handleRemovedFromGroup);
    socket.on("groupListRemovalNotification", handleGroupListRemovalNotification);
    socket.on("chatOrderUpdate", handleChatOrderUpdate);

    return () => {
      socket.off("removedFromGroup", handleRemovedFromGroup);
      socket.off("groupListRemovalNotification", handleGroupListRemovalNotification);
      socket.off("chatOrderUpdate", handleChatOrderUpdate);
    };
  }, [updateChatOrder]); // Add updateChatOrder as dependency

  // Update users when usersData changes
  useEffect(() => {
    if (usersData?.users) {
      console.log("Fetched users with online status:", usersData.users.map(u => ({
        id: u.id,
        name: u.name,
        isOnline: u.isOnline
      })));
      
      // Update users with real-time online status from socket
      const updatedUsers = usersData.users.map(user => ({
        ...user,
        // Override isOnline with real-time socket status if available
        isOnline: onlineUsers.has(user.id) ? true : user.isOnline
      }));
      
      setUsers(updatedUsers);
    }
  }, [usersData, onlineUsers]);

  // Process last messages data
  useEffect(() => {
    if (lastMessagesData?.getLastMessages) {
      console.log("Fetched last messages:", lastMessagesData.getLastMessages);
      
      const messagesMap = {};
      lastMessagesData.getLastMessages.forEach(msg => {
        // Determine the other user in the conversation
        const otherUserId = msg.sender.id === sender?.id ? msg.receiver.id : msg.sender.id;
        messagesMap[otherUserId] = msg;
      });
      
      setLastMessages(messagesMap);
    }
  }, [lastMessagesData, sender?.id]);
  
  // Function to update users with latest online status
  const updateUsersOnlineStatus = () => {
    setUsers(prevUsers => {
      if (!prevUsers) return prevUsers;
      
      return prevUsers.map(user => ({
        ...user,
        isOnline: onlineUsers.has(user.id) ? true : user.isOnline
      }));
    });
  };

  // Helper function to format last message
  const formatLastMessage = (userId) => {
    const lastMsg = lastMessages[userId];
    if (!lastMsg) return null;

    // If message has media, show media type
    if (lastMsg.media) {
      if (lastMsg.media.type === 'image') return '📷 Photo';
      if (lastMsg.media.type === 'video') return '🎥 Video';
      if (lastMsg.media.type === 'audio') return '🎵 Audio';
      return '📎 File';
    }

    // If message has text, show truncated text
    if (lastMsg.message) {
      return lastMsg.message.length > 30 
        ? lastMsg.message.substring(0, 30) + '...' 
        : lastMsg.message;
    }

    return 'Message';
  };

  // Periodic refresh of user list and last messages every 10 seconds using Apollo refetch
  useEffect(() => {
    const userRefreshInterval = setInterval(() => {
      if (refetchUsers) {
        refetchUsers();
      }
      if (refetchLastMessages) {
        refetchLastMessages();
      }
    }, 10000);
    return () => {
      clearInterval(userRefreshInterval);
    };
  }, [refetchUsers, refetchLastMessages]);

  // When a new group is created, refetch groups from backend
  useEffect(() => {
    if (activeTab === 'groups' && sender?.id) {
      refetchGroups && refetchGroups();
    }
  }, [createdGroups, activeTab, sender?.id, refetchGroups]);

  // Function to fetch unread counts for all groups
  const fetchGroupUnreadCounts = async () => {
    if (!groupsData?.getUserGroups || !sender?.id) {
      console.log('❌ Cannot fetch unread counts:', {
        hasGroups: !!groupsData?.getUserGroups,
        hasSender: !!sender?.id
      });
      return;
    }
    
    console.log('🔍 Fetching unread counts for groups:', groupsData.getUserGroups.length);
    const rawToken = GetRawTokenFromCookie();
    console.log('🔑 Raw token for unread count:', rawToken ? 'Present' : 'Missing');
    console.log('👤 Current sender:', { id: sender.id, name: sender.name });
    
    const counts = {};
    for (const group of groupsData.getUserGroups) {
      try {
        console.log(`📊 Fetching unread count for group: ${group.name} (${group._id})`);
        const response = await fetch('http://localhost:5000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GetRawTokenFromCookie()}`
          },
          body: JSON.stringify({
            query: `
              query GetGroupUnreadCount($groupId: ID!) {
                getGroupUnreadCount(groupId: $groupId)
              }
            `,
            variables: { groupId: group._id }
          })
        });
        
        console.log(`📡 Response status for ${group.name}:`, response.status, response.statusText);
        
        if (!response.ok) {
          console.error(`❌ HTTP error for group ${group.name}:`, response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response body:', errorText.substring(0, 200));
          continue; // Skip this group and continue with others
        }
        
        const result = await response.json();
        console.log(`📋 Response for group ${group.name}:`, result);
        
        if (result.errors) {
          console.error(`❌ GraphQL errors for group ${group.name}:`, result.errors);
        }
        
        if (result.data?.getGroupUnreadCount !== undefined) {
          counts[group._id] = result.data.getGroupUnreadCount;
          console.log(`✅ Unread count for ${group.name}: ${result.data.getGroupUnreadCount}`);
        } else {
          console.warn(`⚠️ No unread count data for group ${group.name}`);
        }
      } catch (error) {
        console.error('❌ Error fetching unread count for group:', group._id, error);
      }
    }
    
    setGroupUnreadCounts(counts);
  };

  // Function to fetch unread counts for all users
  const fetchUserUnreadCounts = async () => {
    if (!usersData?.users || !sender?.id) {
      console.log('❌ Cannot fetch user unread counts:', {
        hasUsers: !!usersData?.users,
        hasSender: !!sender?.id
      });
      return;
    }
    
    console.log('🔍 Fetching unread counts for users:', usersData.users.length);
    const rawToken = GetRawTokenFromCookie();
    
    const counts = {};
    for (const user of usersData.users) {
      if (user.id === sender.id) continue; // Skip self
      
      try {
        console.log(`📊 Fetching unread count from user: ${user.name} (${user.id})`);
        const response = await fetch('http://localhost:5000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${rawToken}`
          },
          body: JSON.stringify({
            query: `
              query GetUnreadCount($senderId: ID!, $receiverId: ID!) {
                getUnreadCount(senderId: $senderId, receiverId: $receiverId)
              }
            `,
            variables: { 
              senderId: user.id, 
              receiverId: sender.id 
            }
          })
        });
        
        if (!response.ok) {
          console.error(`❌ HTTP error for user ${user.name}:`, response.status);
          continue;
        }
        
        const result = await response.json();
        
        if (result.errors) {
          console.error(`❌ GraphQL errors for user ${user.name}:`, result.errors);
        }
        
        if (result.data?.getUnreadCount !== undefined) {
          counts[user.id] = result.data.getUnreadCount;
          console.log(`✅ Unread count from ${user.name}: ${result.data.getUnreadCount}`);
        }
      } catch (error) {
        console.error('❌ Error fetching unread count for user:', user.id, error);
      }
    }
    
    setUserUnreadCounts(counts);
  };

  // Fetch unread counts when groups data changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for unread counts:', {
      activeTab,
      hasGroupsData: !!groupsData?.getUserGroups,
      groupsCount: groupsData?.getUserGroups?.length,
      senderId: sender?.id,
      senderName: sender?.name
    });
    
    if (activeTab === 'groups' && groupsData?.getUserGroups && sender?.id) {
      console.log('✅ All conditions met, fetching unread counts...');
      fetchGroupUnreadCounts();
    } else {
      console.log('❌ Conditions not met for fetching unread counts');
    }
  }, [groupsData, activeTab, sender?.id]);

  // Fetch user unread counts when activeTab is 'all'
  useEffect(() => {
    console.log('🔄 useEffect triggered for user unread counts:', {
      activeTab,
      hasUsersData: !!usersData?.users,
      usersCount: usersData?.users?.length,
      senderId: sender?.id,
      senderName: sender?.name
    });
    
    if (activeTab === 'all' && usersData?.users && sender?.id) {
      console.log('✅ All conditions met, fetching user unread counts...');
      fetchUserUnreadCounts();
    } else {
      console.log('❌ Conditions not met for fetching user unread counts');
    }
  }, [usersData, activeTab, sender?.id]);

  // Periodic refresh of unread counts every 30 seconds
  useEffect(() => {
    if (activeTab === 'groups') {
      const interval = setInterval(() => {
        fetchGroupUnreadCounts();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    } else if (activeTab === 'all') {
      const interval = setInterval(() => {
        fetchUserUnreadCounts();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab, groupsData, usersData]);

  // Listen for new group messages to update unread counts
  useEffect(() => {
    if (activeTab === 'groups' && sender?.id) {
      const handleNewGroupMessage = (newMessage) => {
        // Only update unread count if the message is not from current user
        // and the group is not currently selected
        if (newMessage.sender.id !== sender.id && 
            (!selectedChat || selectedChat.id !== newMessage.group._id)) {
          setGroupUnreadCounts(prev => ({
            ...prev,
            [newMessage.group._id]: (prev[newMessage.group._id] || 0) + 1
          }));
        }
      };

      socket.on('newGroupMessage', handleNewGroupMessage);

      return () => {
        socket.off('newGroupMessage', handleNewGroupMessage);
      };
    }
  }, [activeTab, sender?.id, selectedChat]);

  // Listen for new 1-on-1 messages to update unread counts
  useEffect(() => {
    if (sender?.id) {
      const handleNewMessage = (newMessage) => {
        // Update last message for this conversation
        const otherUserId = newMessage.sender.id === sender.id ? newMessage.receiver.id : newMessage.sender.id;
        setLastMessages(prev => ({
          ...prev,
          [otherUserId]: newMessage
        }));
        
        // Refetch last messages to ensure fresh data
        if (refetchLastMessages) {
          refetchLastMessages();
        }
        
        // Only update unread count if the message is not from current user
        // and the chat is not currently selected
        if (newMessage.sender.id !== sender.id && 
            (!selectedChat || selectedChat.id !== newMessage.sender.id)) {
          setUserUnreadCounts(prev => ({
            ...prev,
            [newMessage.sender.id]: (prev[newMessage.sender.id] || 0) + 1
          }));
          
          console.log(`📬 New message from ${newMessage.sender.name}, updated unread count`);
        } else if (newMessage.sender.id !== sender.id && selectedChat && selectedChat.id === newMessage.sender.id) {
          // If message is from active chat, mark as read immediately
          console.log(`📖 Message from active chat ${newMessage.sender.name}, marking as read`);
          setTimeout(() => {
            markActiveMessagesAsRead();
          }, 50);
        }
      };

      socket.on('receiveMessage', handleNewMessage);

      return () => {
        socket.off('receiveMessage', handleNewMessage);
      };
    }
  }, [sender?.id, selectedChat]);

  // Listen for typing indicators in 1-on-1 chats
  useEffect(() => {
    if (sender?.id && selectedChat && !selectedChat.isGroup) {
      const handleUserTyping = ({ userId, userName, profileImage, isTyping }) => {
        if (userId === selectedChat.id) {
          if (isTyping) {
            setTypingUser({ userId, userName, profileImage });
          } else {
            setTypingUser(null);
          }
        }
      };

      socket.on('userTypingStatus', handleUserTyping);

      return () => {
        socket.off('userTypingStatus', handleUserTyping);
      };
    } else {
      // Clear typing indicator when switching away from 1-on-1 chat
      setTypingUser(null);
    }
  }, [sender?.id, selectedChat]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // Clear unread count and mark messages as read when user opens a chat
  useEffect(() => {
    if (selectedChat && !selectedChat.isGroup) {
      // Clear unread count for the selected user
      setUserUnreadCounts(prev => {
        if (prev[selectedChat.id] > 0) {
          console.log(`🔄 Clearing unread count for ${selectedChat.name}`);
          const updated = { ...prev };
          delete updated[selectedChat.id];
          return updated;
        }
        return prev;
      });
      
      // Mark messages as read in backend
      markActiveMessagesAsRead();
    }
  }, [selectedChat]);

  // Refresh unread counts when switching to groups tab
  useEffect(() => {
    if (activeTab === 'groups' && groupsData?.getUserGroups && sender?.id) {
      console.log('🔄 Tab switched to groups, fetching unread counts...');
      // Small delay to ensure UI is ready
      setTimeout(() => {
        fetchGroupUnreadCounts();
      }, 100);
    }
  }, [activeTab]);

  // Fetch unread counts when sender becomes available (important for page refresh)
  useEffect(() => {
    if (sender?.id && activeTab === 'groups' && groupsData?.getUserGroups) {
      console.log('👤 Sender available, fetching unread counts for page refresh...');
      // Add a small delay to ensure everything is properly initialized
      setTimeout(() => {
        fetchGroupUnreadCounts();
      }, 500);
    }
  }, [sender?.id]);

  // Additional effect to ensure unread counts are fetched on component mount
  useEffect(() => {
    if (activeTab === 'groups') {
      console.log('🔄 Component mounted with groups tab active');
      // Retry mechanism for fetching unread counts
      const retryFetch = () => {
        if (sender?.id && groupsData?.getUserGroups) {
          console.log('🔄 Retry: All data available, fetching unread counts...');
          fetchGroupUnreadCounts();
        } else {
          console.log('🔄 Retry: Data not ready yet, will try again...');
          setTimeout(retryFetch, 1000);
        }
      };
      
      // Start retry mechanism after a short delay
      setTimeout(retryFetch, 200);
    }
  }, []); // Only run on mount

  let receiverId = selectedChat?.id;

  // Update messages when messagesData changes
  useEffect(() => {
    if (messagesData?.getMessages) {
      setMessages(messagesData.getMessages);
      
      // Clear unread count and mark messages as read for the selected chat when messages are loaded
      if (selectedChat && !selectedChat.isGroup) {
        setUserUnreadCounts(prev => {
          if (prev[selectedChat.id] > 0) {
            console.log(`🔄 Messages loaded, clearing unread count for ${selectedChat.name}`);
            const updated = { ...prev };
            delete updated[selectedChat.id];
            return updated;
          }
          return prev;
        });
        
        // Mark messages as read in backend
        markActiveMessagesAsRead();
      }
    }
  }, [messagesData, selectedChat]);

  useEffect(() => {
    if (sender?.id && socket?.connected) {
      socket.emit("join", sender.id.toString());
    }
  }, [sender?.id]);

  // Function to handle group updates from GroupChat component
  const handleGroupUpdate = (updatedGroup) => {
    console.log('🔄 ChatList: Received group update request');
    console.log('📊 Updated group data:', updatedGroup);
    console.log('🎯 Current selectedChat:', selectedChat);
    
    setSelectedChat(updatedGroup);
    console.log('✅ ChatList: selectedChat updated');
    
    // Also update the groups list if needed
    if (refetchGroups) {
      console.log('🔄 ChatList: Refetching groups from backend');
      refetchGroups();
    }
  };

  const handleChatSelect = async (user) => {
    try {
      setIsAnimating(true);
      setSelectedChat(user);
      
      // If it's a group, mark all unread messages as read
      if (user.isGroup && user.id) {
        const previousCount = groupUnreadCounts[user.id] || 0;
        
        // Reset unread count immediately for better UX
        setGroupUnreadCounts(prev => ({
          ...prev,
          [user.id]: 0
        }));
        
        // Mark messages as read in the background
        try {
          // Get all unread messages for this group and mark them as read
          const response = await fetch('http://localhost:5000/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GetRawTokenFromCookie()}`
            },
            body: JSON.stringify({
              query: `
                query GetGroupMessages($groupId: ID!, $limit: Int, $offset: Int) {
                  getGroupMessages(groupId: $groupId, limit: $limit, offset: $offset) {
                    _id
                    sender {
                      id
                    }
                    readBy {
                      user {
                        id
                      }
                    }
                  }
                }
              `,
              variables: { groupId: user.id, limit: 50, offset: 0 }
            })
          });
          
          const result = await response.json();
          if (result.data?.getGroupMessages) {
            // Find messages not read by current user (excluding own messages)
            const unreadMessages = result.data.getGroupMessages.filter(msg => 
              msg.sender.id !== sender?.id && // Exclude own messages
              !msg.readBy.some(read => read.user.id === sender?.id)
            );
            
            console.log(`📖 Marking ${unreadMessages.length} messages as read for group ${user.id}`);
            
            // Mark each unread message as read
            for (const message of unreadMessages) {
              try {
                await markGroupMessageAsRead({
                  variables: { messageId: message._id }
                });
              } catch (error) {
                console.error('Error marking message as read:', message._id, error);
              }
            }
          }
        } catch (error) {
          console.error('Error marking group messages as read:', error);
          // If there's an error, restore the previous count
          setGroupUnreadCounts(prev => ({
            ...prev,
            [user.id]: previousCount
          }));
        }
      } else if (!user.isGroup && user.id && sender?.id) {
        // If it's a 1-on-1 chat, mark all messages from this user as seen
        const previousCount = userUnreadCounts[user.id] || 0;
        
        // Reset unread count immediately for better UX
        setUserUnreadCounts(prev => ({
          ...prev,
          [user.id]: 0
        }));
        
        // Mark messages as seen in the background
        try {
          await markAllMessagesAsSeenMutation({
            variables: {
              senderId: user.id,
              receiverId: sender.id
            }
          });
          
          console.log(`✅ Marked all messages from ${user.name} as seen`);
        } catch (error) {
          console.error('❌ Error marking 1-on-1 messages as seen:', error);
          // If there's an error, restore the previous count
          setUserUnreadCounts(prev => ({
            ...prev,
            [user.id]: previousCount
          }));
        }
      }
      
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error("Error selecting chat:", error);
    }
  };

  // Validate video duration
  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        resolve(duration <= 60); // 60 seconds limit
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(false);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection (for photos only)
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      event.target.value = ''; // Reset file input
      return;
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    
    // Don't send immediately - just show preview
    console.log("📁 File selected for preview:", file.name);
    
    // Reset file input
    event.target.value = '';
  };

  // Handle video selection
  const handleVideoSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate video duration (only check duration, no file size limit)
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
      alert("Video duration should be less than or equal to 60 seconds");
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    console.log("🎥 Video selected for 1-on-1 chat:", file.name);
    event.target.value = '';
  };

  // Handle GIF selection (similar to file selection - just set selected GIF)
  const handleGifSelect = (gif) => {
    try {
      console.log("🎬 GIF selected for preview:", gif);
      
      // Create a GIF object similar to file structure
      const gifData = {
        url: gif.url || gif.images?.original?.url,
        type: 'gif',
        filename: `gif-${Date.now()}.gif`,
        size: gif.images?.original?.size || 0,
        isGif: true // Flag to identify it's a GIF
      };

      setSelectedFile(gifData);
      setShowGifPicker(false);
      
      // Don't send immediately - just show preview like images
      console.log("🎬 GIF selected for preview:", gifData.filename);
      
    } catch (error) {
      console.error("❌ Error selecting GIF:", error);
      alert("GIF select karne mein error aaya");
    }
  };

  // Send media message using GraphQL mutation (with optional text caption)
  const sendMediaMessage = async (file, caption = '') => {
    console.log("🚀 === GRAPHQL MEDIA MESSAGE SEND DEBUG START ===");
    console.log("📋 Initial State:", {
      senderId: sender?.id,
      receiverId: selectedChat?.id,
      fileName: file?.name || file?.filename,
      fileType: file?.type,
      fileSize: file?.size,
      isGif: file?.isGif,
      caption: caption
    });

    if (!sender?.id || !selectedChat?.id) {
      console.error("❌ Missing sender or receiver");
      alert("Sender ya Receiver select nahi hua");
      return;
    }

    setIsUploading(true);
    
    // Check if it's a GIF (already has URL) or regular file (needs upload)
    const isGif = file?.isGif || false;
    
    // Create temporary message with media for immediate UI feedback
    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: caption || null, // Include caption if provided
      media: {
        url: isGif ? file.url : URL.createObjectURL(file), // Use GIF URL directly or create object URL for files
        type: isGif ? 'gif' : (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'),
        filename: file.filename || file.name,
        size: file.size
      },
      createdAt: new Date().toISOString(),
      sender: {
        id: sender.id,
        name: sender.name
      },
      receiver: {
        id: selectedChat.id,
        name: selectedChat.name
      },
      isTemporary: true // Flag to identify temporary messages
    };
    
    try {
      console.log("📱 STEP 1: Adding temporary message to UI");
      setMessages(prev => {
        console.log("📊 Current messages count before adding temp:", prev.length);
        const newMessages = [...prev, tempMessage];
        console.log("📊 Messages count after adding temp:", newMessages.length);
        return newMessages;
      });

      if (isGif) {
        // For GIFs, use existing sendMessage mutation with media data
        console.log("🎬 STEP 2: Processing GIF with existing sendMessage mutation");
        const mediaData = {
          url: file.url,
          type: 'gif',
          filename: file.filename,
          size: file.size
        };

        console.log("📤 STEP 3: Starting GraphQL sendMessage mutation for GIF");
        const mutationStartTime = Date.now();
        const response = await sendMessageMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: caption || null,
            media: mediaData
          }
        });
        const mutationEndTime = Date.now();

        console.log("✅ STEP 3 COMPLETE: GraphQL mutation finished");
        console.log("⏱️ Mutation time:", mutationEndTime - mutationStartTime, "ms");

        // Replace temporary message with real one
        if (response?.data?.sendMessage) {
          const realMessage = response.data.sendMessage;
          console.log("🔄 Replacing temporary GIF message with real message");
          
          // Update last message for this conversation
          setLastMessages(prev => ({
            ...prev,
            [selectedChat.id]: realMessage
          }));
          
          setMessages(prev => {
            const replaced = prev.map(msg => {
              if (msg.id === tempMessage.id) {
                return realMessage;
              }
              return msg;
            });
            return replaced;
          });
          
          // Update chat order to move this conversation to top of sender's chat list
          updateChatOrder(selectedChat.id);
          
          // Emit socket event to notify receiver to move sender to top of their chat list
          socket.emit('updateChatOrder', {
            receiverId: selectedChat.id,
            senderId: sender.id,
            senderName: sender.name,
            contentType: 'gif',
            timestamp: Date.now()
          });
        }
      } else {
        // For regular files, use new sendMessageWithFile mutation
        console.log("📤 STEP 2: Using GraphQL sendMessageWithFile mutation for regular files");
        console.log("📁 File details:", {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        });

        const mutationStartTime = Date.now();
        const response = await sendMessageWithFileMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: caption || null,
            file: file // Direct file upload through GraphQL
          }
        });
        const mutationEndTime = Date.now();

        console.log("✅ STEP 2 COMPLETE: GraphQL sendMessageWithFile mutation finished");
        console.log("⏱️ Mutation time:", mutationEndTime - mutationStartTime, "ms");
        console.log("📋 GraphQL response:", {
          hasData: !!response?.data,
          hasSendMessageWithFile: !!response?.data?.sendMessageWithFile,
          messageId: response?.data?.sendMessageWithFile?.id,
          messageMedia: response?.data?.sendMessageWithFile?.media
        });

        // Replace temporary message with real one
        if (response?.data?.sendMessageWithFile) {
          const realMessage = response.data.sendMessageWithFile;
          console.log("🔄 Replacing temporary file message with real message");
          console.log("📋 Real message data:", {
            id: realMessage.id,
            mediaUrl: realMessage.media?.url,
            mediaType: realMessage.media?.type,
            mediaFilename: realMessage.media?.filename,
            senderId: realMessage.sender?.id,
            receiverId: realMessage.receiver?.id
          });
          
          setMessages(prev => {
            const replaced = prev.map(msg => {
              if (msg.id === tempMessage.id) {
                console.log("✅ Successfully replaced temporary message with real message");
                return realMessage;
              }
              return msg;
            });
            console.log("📊 Messages after replacement:", replaced.length);
            return replaced;
          });
          
          // Update last message for this conversation
          setLastMessages(prev => ({
            ...prev,
            [selectedChat.id]: realMessage
          }));
          
          // Update chat order to move this conversation to top of sender's chat list
          updateChatOrder(selectedChat.id);
          
          // Emit socket event to notify receiver to move sender to top of their chat list
          socket.emit('updateChatOrder', {
            receiverId: selectedChat.id,
            senderId: sender.id,
            senderName: sender.name,
            contentType: 'file',
            timestamp: Date.now()
          });
        }
      }

      console.log("✅ Media message sent successfully using GraphQL!");
      
      // Refresh messages to ensure consistency
      if (refetchMessages) {
        console.log("🔄 Scheduling message refetch in 500ms");
        setTimeout(() => {
          refetchMessages();
        }, 500);
      }

      // Scroll to bottom
      setTimeout(() => {
        const chatContainer = document.querySelector('.overflow-y-auto');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);

    } catch (error) {
      console.error("❌ === GRAPHQL MEDIA MESSAGE SEND ERROR ===");
      console.error("❌ Error type:", error.constructor.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Full error:", error);
      
      // Remove temporary message on error
      console.log("🗑️ Removing temporary message due to error:", tempMessage.id);
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempMessage.id);
        console.log("📊 Messages after error cleanup:", filtered.length);
        return filtered;
      });
      
      // Detailed error analysis
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("🔗 GRAPHQL ERROR:");
        console.error("📋 GraphQL errors:", error.graphQLErrors);
        error.graphQLErrors.forEach((gqlError, index) => {
          console.error(`📋 GraphQL Error ${index + 1}:`, {
            message: gqlError.message,
            locations: gqlError.locations,
            path: gqlError.path,
            extensions: gqlError.extensions
          });
        });
        alert(`Failed to send message: ${error.graphQLErrors[0].message}`);
      } else if (error.networkError) {
        console.error("🌐 NETWORK ERROR:");
        console.error("📋 Network error details:", error.networkError);
        alert("Network error occurred. Please check your connection.");
      } else {
        console.error("❓ UNKNOWN ERROR:");
        console.error("📋 Error stack:", error.stack);
        alert("Failed to send media. Please try again.");
      }
      
      console.log("❌ === GRAPHQL MEDIA MESSAGE SEND ERROR END ===");
    } finally {
      console.log("🏁 FINALLY: Cleaning up upload state");
      setIsUploading(false);
      setSelectedFile(null);
      setText(''); // Clear text input as well
      console.log("🚀 === GRAPHQL MEDIA MESSAGE SEND DEBUG END ===");
    }
  };

  const handleEmojiSelect = (event, emojiObject) => {
    const emoji = emojiObject?.emoji || event?.emoji;
    if (recordedAudio) {
      setAudioMessage((prev) => prev + emoji);
    } else {
      setText((prev) => prev + emoji);
    }
  };

  // Handle typing for 1-on-1 chats
  const handleTyping = (e) => {
    setText(e.target.value);
    
    if (selectedChat && !selectedChat.isGroup && sender?.id) {
      if (!isTyping) {
        setIsTyping(true);
        socket.sendUserTyping(selectedChat.id, true, sender.name);
        
        setTimeout(() => {
          setIsTyping(false);
          socket.sendUserTyping(selectedChat.id, false, sender.name);
        }, 2000);
      }
    }
  };

  const chat = async () => {
    // Check if we have recorded audio to send
    if (recordedAudio) {
      console.log("🎤 Sending recorded audio with message:", audioMessage);
      await sendAudioMessage();
      return;
    }
    
    // Check if we have a selected file to send
    if (selectedFile) {
      console.log("📤 Sending selected file with caption:", selectedFile.name, text);
      await sendMediaMessage(selectedFile, text.trim()); // Pass text as caption
      return;
    }
    
    // For text messages
    if (!text.trim()) return;
    
    if (!sender?.id || !selectedChat?.id) {
      alert("Sender ya Receiver select nahi hua");
      return;
    }
    try {
      let finalMessage = text;
      let replyMeta = null;
      if (replyToMsg) {
        // Prepend quoted text for UI
        finalMessage = `> ${replyToMsg.message}\n${text}`;
        replyMeta = { replyToId: replyToMsg.id, replyToText: replyToMsg.message };
      }
      
      // Create a temporary message to display immediately
      const tempMessage = {
        id: `temp-${Date.now()}`,
        message: finalMessage,
        createdAt: new Date().toISOString(),
        sender: {
          id: sender.id,
          name: sender.name
        },
        receiver: {
          id: selectedChat.id,
          name: selectedChat.name
        },
        isTemporary: true // Flag to identify temporary messages
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Clear input after send
      setText("");
      setReplyToMsg(null);
      
      // Stop typing indicator when message is sent
      if (selectedChat && !selectedChat.isGroup && sender?.id) {
        setIsTyping(false);
        socket.sendUserTyping(selectedChat.id, false, sender.name);
      }
      
      // Now send the message to the server using GraphQL mutation
      const response = await sendMessageMutation({
        variables: {
          senderId: sender?.id,
          receiverId: selectedChat?.id,
          message: finalMessage,
          media: null
        }
      });
      
      // Replace the temporary message with the real one from the server
      if (response?.data?.sendMessage) {
        const realMessage = response.data.sendMessage;
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? realMessage : msg
        ));
        
        // Update last message for this conversation
        setLastMessages(prev => ({
          ...prev,
          [selectedChat.id]: realMessage
        }));
        
        // Update chat order to move this conversation to top of sender's chat list
        updateChatOrder(selectedChat.id);
        
        // Emit socket event to notify receiver to move sender to top of their chat list
        socket.emit('updateChatOrder', {
          receiverId: selectedChat.id,
          senderId: sender.id,
          senderName: sender.name,
          contentType: 'message',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(error.response?.data?.errors?.[0]?.message || "Unknown error");
      // If there's an error, remove the temporary message
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      alert("Failed to send message. Please try again.");
    }
  }
  
  // Function to delete a message
  const deleteMessage = async (messageId) => {
    try {
      const response = await deleteMessageMutation({
        variables: {
          messageId: messageId
        }
      });
      
      // Close any open menus
      setOpenMenuMsgId(null);
      setMobileMenuMsgId(null);
      
      // The socket event will handle removing the message from the UI
      console.log("Message deleted:", messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  }

  // Direct socket event handler
  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingMessage = (msg) => {
      console.log("📨 === SOCKET MESSAGE RECEIVED ===");
      console.log("📋 Message details:", {
        id: msg.id,
        hasMessage: !!msg.message,
        messageText: msg.message ? msg.message.substring(0, 50) + "..." : null,
        hasMedia: !!msg.media,
        mediaType: msg.media?.type,
        mediaFilename: msg.media?.filename,
        mediaUrl: msg.media?.url ? msg.media.url.substring(0, 50) + "..." : null,
        senderId: msg.sender?.id,
        senderName: msg.sender?.name,
        receiverId: msg.receiver?.id,
        receiverName: msg.receiver?.name,
        createdAt: msg.createdAt
      });
      
      console.log("🔍 Current chat context:", {
        selectedChatId: selectedChat?.id,
        selectedChatName: selectedChat?.name,
        currentUserId: sender?.id,
        currentUserName: sender?.name
      });
      
      // If we have a selected chat and the message is related to it, update the messages
      const isRelevantMessage = selectedChat && (
        msg.sender.id === selectedChat.id ||
        msg.receiver.id === selectedChat.id
      );
      
      console.log("🔍 Message relevance check:", {
        isRelevantMessage,
        senderMatchesChat: msg.sender.id === selectedChat?.id,
        receiverMatchesChat: msg.receiver.id === selectedChat?.id
      });
      
      if (isRelevantMessage) {
        console.log("✅ Message is relevant to current chat, processing...");
        // Update messages state with the new message
        setMessages(prev => {
          console.log("📊 Current messages count:", prev.length);
          console.log("🔍 Checking for existing message with ID:", msg.id);
          
          // Check if this message is already in our list (to avoid duplicates)
          const messageExists = prev.some(existingMsg => {
            const exists = existingMsg.id === msg.id;
            if (exists) {
              console.log("⚠️ Message already exists in list:", existingMsg.id);
            }
            return exists;
          });
          
          // Check if this is a message we sent (already in our state with a temp ID)
          // Handle both text messages and media messages
          const isOurTempMessage = prev.some(existingMsg => {
            if (!existingMsg.id.startsWith('temp-')) return false;
            
            // For text messages
            if (msg.message && existingMsg.message) {
              const isMatch = existingMsg.message === msg.message &&
                             existingMsg.sender.id === msg.sender.id &&
                             existingMsg.receiver.id === msg.receiver.id;
              if (isMatch) {
                console.log("🔍 Socket: Found matching temporary text message:", existingMsg.id);
              }
              return isMatch;
            }
            
            // For media messages
            if (msg.media && existingMsg.media) {
              const isMatch = existingMsg.sender.id === msg.sender.id &&
                             existingMsg.receiver.id === msg.receiver.id &&
                             existingMsg.media.filename === msg.media.filename &&
                             existingMsg.media.type === msg.media.type;
              if (isMatch) {
                console.log("🔍 Socket: Found matching temporary media message:", existingMsg.id);
              }
              return isMatch;
            }
            
            return false;
          });
          
          if (messageExists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }
          
          console.log("🔍 Checking for temporary message to replace...");
          console.log("📋 isOurTempMessage:", isOurTempMessage);
          console.log("📋 msg.sender.id === sender?.id:", msg.sender.id === sender?.id);
          
          // If this is our own message that we already added as a temp message,
          // replace the temp message with the real one
          if (isOurTempMessage && msg.sender.id === sender?.id) {
            console.log("🔄 Socket: Found temporary message to replace, processing...");
            return prev.map(existingMsg => {
              if (!existingMsg.id.startsWith('temp-')) {
                return existingMsg;
              }
              
              console.log("🔍 Checking temp message:", existingMsg.id);
              
              // For text messages
              if (msg.message && existingMsg.message) {
                const textMatch = existingMsg.message === msg.message &&
                                 existingMsg.sender.id === msg.sender.id &&
                                 existingMsg.receiver.id === msg.receiver.id;
                console.log("📝 Text message match check:", {
                  messageMatch: existingMsg.message === msg.message,
                  senderMatch: existingMsg.sender.id === msg.sender.id,
                  receiverMatch: existingMsg.receiver.id === msg.receiver.id,
                  overallMatch: textMatch
                });
                
                if (textMatch) {
                  console.log("✅ Socket: Replaced text message:", existingMsg.id, "->", msg.id);
                  return msg;
                }
              }
              
              // For media messages
              if (msg.media && existingMsg.media) {
                const mediaMatch = existingMsg.sender.id === msg.sender.id &&
                                  existingMsg.receiver.id === msg.receiver.id &&
                                  existingMsg.media.filename === msg.media.filename &&
                                  existingMsg.media.type === msg.media.type;
                console.log("📸 Media message match check:", {
                  senderMatch: existingMsg.sender.id === msg.sender.id,
                  receiverMatch: existingMsg.receiver.id === msg.receiver.id,
                  filenameMatch: existingMsg.media.filename === msg.media.filename,
                  typeMatch: existingMsg.media.type === msg.media.type,
                  overallMatch: mediaMatch,
                  existingFilename: existingMsg.media.filename,
                  incomingFilename: msg.media.filename,
                  existingType: existingMsg.media.type,
                  incomingType: msg.media.type
                });
                
                if (mediaMatch) {
                  console.log("✅ Socket: Replaced media message:", existingMsg.id, "->", msg.id);
                  return msg;
                }
              }
              
              return existingMsg;
            });
          }
          
          console.log("➕ Adding new message to list");
          const newMessages = [...prev, msg];
          console.log("📊 Messages count after adding:", newMessages.length);
          return newMessages;
        });
        
        // Message will be scrolled by useEffect automatically
        
        console.log("✅ Socket message processing complete");
      }
      
      // Always update lastMessages for any received message (even if not for current chat)
      // This ensures the user list stays sorted correctly
      const otherUserId = msg.sender.id === sender?.id ? msg.receiver.id : msg.sender.id;
      setLastMessages(prev => ({
        ...prev,
        [otherUserId]: msg
      }));
      
      // Unread count is handled by handleNewMessage function, no need to duplicate here
      
      if (!isRelevantMessage) {
        console.log("⚠️ Message not relevant to current chat, but updated lastMessages");
      }
      
      console.log("📨 === SOCKET MESSAGE PROCESSED ===");
    };

    // Handle message deletion events
    const handleMessageDeleted = (deleteInfo) => {
      console.log("Socket message deleted event received:", deleteInfo);
      
      // Remove the deleted message from our messages state
      setMessages(prev => prev.filter(msg => msg.id !== deleteInfo.messageId));
    };
    
    // Add socket event listeners
    socket.on("receiveMessage", handleIncomingMessage);
    socket.on("messageDeleted", handleMessageDeleted);

    // Cleanup on unmount
    return () => {
      socket.off("receiveMessage", handleIncomingMessage);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [selectedChat]);
  
  // Add a polling mechanism as a fallback
  useEffect(() => {
    if (!selectedChat || !sender) return;
    
    // Poll for new messages every 3 seconds
    const intervalId = setInterval(() => {
      if (refetchMessages) {
        refetchMessages();
      }
    }, 3000);
    
    // Cleanup stuck temporary messages after 30 seconds
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        const now = Date.now();
        return prev.filter(msg => {
          if (msg.isTemporary && msg.id.startsWith('temp-')) {
            const messageTime = parseInt(msg.id.split('-')[1]);
            const timeDiff = now - messageTime;
            // Remove temporary messages older than 30 seconds
            if (timeDiff > 30000) {
              console.log('Removing stuck temporary message:', msg.id);
              return false;
            }
          }
          return true;
        });
      });
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(intervalId);
      clearInterval(cleanupInterval);
    };
  }, [selectedChat, sender, refetchMessages]);

  useEffect(() => {
    if (!showAttachmentBar) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (attachmentBarRef.current && !attachmentBarRef.current.contains(event.target)) {
            setShowAttachmentBar(false);
          }
        } catch (error) {
          console.error("Error handling click outside attachment bar:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up attachment bar click handler:", error);
    }
  }, [showAttachmentBar]);

  useEffect(() => {
    if (!showGifPicker) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (gifPickerRef.current && !gifPickerRef.current.contains(event.target)) {
            setShowGifPicker(false);
          }
        } catch (error) {
          console.error("Error handling click outside GIF picker:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing GIF picker event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up GIF picker click handler:", error);
    }
  }, [showGifPicker]);

  // Close GIF picker when attachment bar is closed
  useEffect(() => {
    if (!showAttachmentBar && showGifPicker) {
      setShowGifPicker(false);
    }
  }, [showAttachmentBar, showGifPicker]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
            setHeaderMenuOpen(false);
          }
        } catch (error) {
          console.error("Error handling click outside header menu:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up header menu click handler:", error);
    }
  }, [headerMenuOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, mediaRecorder]);

   const videocall = () => {
     if (!selectedChat) {
       alert('Please select a user to call');
       return;
     }

     const decodedUser = GetTokenFromCookie();
     const roomID = `room_${Date.now()}`;
     const callerID = decodedUser?.id;
     const calleeID = selectedChat.id;

     console.log('📞 Initiating video call:', { callerID, calleeID, roomID });

     // Send socket event to notify callee
     socket.emit("call-user", {
       calleeID,
       roomID,
       callerID,
       callerName: decodedUser?.name,
       callerImage: decodedUser?.profileImage
     });

     // Navigate caller to video call page immediately
     console.log('🚀 Caller navigating to video call page');
     navigate(`/video-call?roomID=${roomID}&userID=${callerID}`);
     
     // Listen for call response (for cleanup purposes)
     const handleCallAccepted = ({ roomID: acceptedRoomID, calleeID: acceptedCalleeID }) => {
       if (acceptedRoomID === roomID) {
         console.log('✅ Call accepted by callee');
         socket.off('call-accepted', handleCallAccepted);
         socket.off('call-declined', handleCallDeclined);
         // Caller is already on video call page, no need to navigate again
       }
     };

     const handleCallDeclined = ({ roomID: declinedRoomID }) => {
       if (declinedRoomID === roomID) {
         console.log('❌ Call declined by callee');
         socket.off('call-accepted', handleCallAccepted);
         socket.off('call-declined', handleCallDeclined);
         // Could show a toast notification instead of alert since user is on video call page
         console.log(`❌ ${selectedChat.name || selectedChat.username} declined the call`);
       }
     };

     // Set up listeners for call response
     socket.on('call-accepted', handleCallAccepted);
     socket.on('call-declined', handleCallDeclined);

     // Auto cleanup after 30 seconds if no response
     setTimeout(() => {
       socket.off('call-accepted', handleCallAccepted);
       socket.off('call-declined', handleCallDeclined);
       console.log('⏰ Call timeout - no response');
       // Could show a toast notification instead of alert since user is on video call page
       console.log(`⏰ ${selectedChat.name || selectedChat.username} didn't answer the call`);
     }, 30000);
   }



  // Clear Chat Function
  const handleClearChat = async () => {
    console.log('🔥 === CLEAR CHAT FUNCTION STARTED ===');
    
    console.log('🔍 Selected Chat:', selectedChat);
    console.log('🔍 Sender:', sender);
    console.log('🔍 clearChatMutation function:', clearChatMutation);
    console.log('🔍 Current messages count:', messages.length);
    
    if (!selectedChat || !sender) {
      console.log('❌ Missing selectedChat or sender');
      console.log('❌ selectedChat exists:', !!selectedChat);
      console.log('❌ sender exists:', !!sender);
      alert('Please select a chat to clear');
      return;
    }

    console.log('✅ All required data available, showing confirmation dialog');
    const confirmClear = window.confirm(`Are you sure you want to clear chat with ${selectedChat.name}? This action cannot be undone.`);
    
    if (!confirmClear) {
      console.log('❌ User cancelled clear chat operation');
      return;
    }
    
    console.log('✅ User confirmed clear chat operation');

    try {
      console.log('🧹 === STARTING CLEAR CHAT PROCESS ===');
      console.log('🧹 Clearing chat with data:', { 
        userId: sender.id, 
        chatWithUserId: selectedChat.id,
        senderName: sender.name,
        selectedChatName: selectedChat.name
      });
      
      console.log('🔄 Step 1: Clearing messages from local state immediately');
      // Clear messages from local state immediately for instant UI feedback
      setMessages([]);
      console.log('✅ Step 1 complete: Local messages cleared');
      
      console.log('🔄 Step 2: Executing GraphQL clearChat mutation');
      // Execute GraphQL mutation
      const result = await clearChatMutation({
        variables: {
          userId: sender.id,
          chatWithUserId: selectedChat.id
        }
      });

      console.log('✅ Step 2 complete: Clear chat mutation result:', result);
      console.log('🔍 Mutation success:', !!result?.data?.clearChat);

      // Emit socket event to notify other user about chat clear
      socket.emit('chatCleared', {
        userId: sender.id,
        chatWithUserId: selectedChat.id,
        senderName: sender.name
      });

      // Update last messages to remove this conversation's last message
      setLastMessages(prev => {
        const updated = { ...prev };
        delete updated[selectedChat.id];
        return updated;
      });

      // Refetch messages to ensure consistency with backend
      if (refetchMessages) {
        console.log('🔄 Refetching messages after clear...');
        setTimeout(async () => {
          try {
            await refetchMessages();
            console.log('✅ Messages refetched successfully');
          } catch (refetchError) {
            console.error('❌ Error refetching messages:', refetchError);
          }
        }, 500);
      }

      // Refetch last messages to update chat list
      if (refetchLastMessages) {
        console.log('🔄 Refetching last messages...');
        setTimeout(async () => {
          try {
            await refetchLastMessages();
            console.log('✅ Last messages refetched successfully');
          } catch (refetchError) {
            console.error('❌ Error refetching last messages:', refetchError);
          }
        }, 700);
      }
      
      // Close the menu
      setHeaderMenuOpen(false);
      
      console.log('✅ Chat cleared successfully');
      alert(`Chat with ${selectedChat.name} has been cleared`);
      
    } catch (error) {
      console.error('❌ === CLEAR CHAT ERROR ===');
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Check for specific GraphQL errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error('🔗 GraphQL Errors:');
        error.graphQLErrors.forEach((gqlError, index) => {
          console.error(`🔗 GraphQL Error ${index + 1}:`, {
            message: gqlError.message,
            locations: gqlError.locations,
            path: gqlError.path,
            extensions: gqlError.extensions
          });
        });
      }
      
      if (error.networkError) {
        console.error('🌐 Network Error:', error.networkError);
      }
      
      // Restore messages if mutation failed
      if (refetchMessages) {
        console.log('🔄 Restoring messages due to error...');
        try {
          await refetchMessages();
          console.log('✅ Messages restored successfully');
        } catch (restoreError) {
          console.error('❌ Error restoring messages:', restoreError);
        }
      }
      
      console.error('❌ === CLEAR CHAT ERROR END ===');
      alert(`Failed to clear chat: ${error.message}. Please try again.`);
    }
  };

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaRecorder not supported');
        alert('Audio recording not supported in this browser');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, {
          type: 'audio/webm;codecs=opus'
        });
        
        console.log('🎤 Audio file created:', {
          name: audioFile.name,
          size: audioFile.size,
          type: audioFile.type
        });
        
        // Create audio URL for preview
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Set recorded audio for preview instead of directly uploading
        setRecordedAudio({
          file: audioFile,
          url: audioUrl,
          duration: recordingTime
        });
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      recorder.start();
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      let errorMessage = 'Audio recording failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported in this browser.';
      }
      
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🛑 Stopping recording...');
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('❌ Cancelling recording...');
      mediaRecorder.stop();
      
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setIsRecording(false);
    setRecordingTime(0);
    setAudioChunks([]);
    setRecordedAudio(null);
    setAudioMessage("");
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Function to cancel audio preview
  const cancelAudioPreview = () => {
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url);
    }
    setRecordedAudio(null);
    setAudioMessage("");
  };

  // Function to send audio with message
  const sendAudioMessage = async () => {
    if (!recordedAudio) return;
    
    try {
      console.log('☁️ Uploading audio to Cloudinary...');
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', recordedAudio.file);
      
      const response = await fetch('http://localhost:5000/upload-chat-media', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Audio uploaded successfully:', result);
      
      if (result.success && result.media) {
        const audioResponse = await sendMessageWithFileMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: audioMessage.trim() || null,
            file: recordedAudio.file
          }
        });
        
        console.log('✅ Audio message sent successfully');
        
        // Update last message for this conversation
        if (audioResponse?.data?.sendMessageWithFile) {
          setLastMessages(prev => ({
            ...prev,
            [selectedChat.id]: audioResponse.data.sendMessageWithFile
          }));
        }
        
        // Update chat order to move this conversation to top of sender's chat list
        updateChatOrder(selectedChat.id);
        
        // Emit socket event to notify receiver to move sender to top of their chat list
        socket.emit('updateChatOrder', {
          receiverId: selectedChat.id,
          senderId: sender.id,
          senderName: sender.name,
          contentType: 'audio',
          timestamp: Date.now()
        });
        
        // Clean up
        URL.revokeObjectURL(recordedAudio.url);
        setRecordedAudio(null);
        setAudioMessage("");
        setReplyToMsg(null);
      }
      
    } catch (error) {
      console.error('❌ Error uploading audio:', error);
      alert('Audio upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAudioToCloudinary = async (audioFile) => {
    try {
      console.log('☁️ Uploading audio to Cloudinary...');
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', audioFile);
      
      const response = await fetch('http://localhost:5000/upload-chat-media', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Audio uploaded successfully:', result);
      
      if (result.success && result.media) {
        const audioResponse = await sendMessageWithFileMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: text.trim() || null,
            file: audioFile
          }
        });
        
        console.log('✅ Audio message sent successfully');
        
        // Update last message for this conversation
        if (audioResponse?.data?.sendMessageWithFile) {
          setLastMessages(prev => ({
            ...prev,
            [selectedChat.id]: audioResponse.data.sendMessageWithFile
          }));
        }
        
        setText('');
        setReplyToMsg(null);
      }
      
    } catch (error) {
      console.error('❌ Error uploading audio:', error);
      alert('Audio upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Function to mark messages as read for active chat
  const markActiveMessagesAsRead = async () => {
    if (!selectedChat || selectedChat.isGroup || !sender?.id) return;
    
    try {
      console.log(`📖 Marking messages as read for chat with ${selectedChat.name}`);
      await markAllMessagesAsSeenMutation({
        variables: {
          senderId: selectedChat.id,
          receiverId: sender.id
        }
      });
      console.log(`✅ Messages marked as read for ${selectedChat.name}`);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  };

  // Audio playback functions
  const toggleAudioPlayback = (messageId, audioUrl) => {
    const audio = audioRefs.current[messageId];
    
    if (!audio) {
      const newAudio = new Audio(audioUrl);
      audioRefs.current[messageId] = newAudio;
      
      newAudio.addEventListener('loadedmetadata', () => {
        setAudioDuration(prev => ({
          ...prev,
          [messageId]: newAudio.duration
        }));
      });
      
      newAudio.addEventListener('timeupdate', () => {
        setAudioProgress(prev => ({
          ...prev,
          [messageId]: newAudio.currentTime
        }));
      });
      
      newAudio.addEventListener('ended', () => {
        setPlayingAudio(null);
        setAudioProgress(prev => ({
          ...prev,
          [messageId]: 0
        }));
      });
      
      newAudio.play();
      setPlayingAudio(messageId);
    } else {
      if (playingAudio === messageId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        Object.values(audioRefs.current).forEach(a => a.pause());
        setPlayingAudio(null);
        
        audio.play();
        setPlayingAudio(messageId);
      }
    }
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter users for group or all chats based on activeTab
  let displayedUsers = Array.isArray(users) ? users : [];
  if (activeTab === 'groups') {
    // Show backend groups, plus any new groups created in this session (not yet in backend response)
    // Filter out removed groups
    const backendGroups = (groupsData?.getUserGroups || [])
      .filter(g => !removedGroupIds.has(g._id)) // Filter out removed groups
      .map(g => ({
        ...g,
        id: g._id,
        isGroup: true,
        profileImage: g.groupImage // for compatibility
      }));
    // Add any createdGroups not present in backendGroups (by id)
    const sessionGroups = (Array.isArray(createdGroups) ? createdGroups : []).filter(
      cg => !backendGroups.some(bg => bg.id === cg.id) && !removedGroupIds.has(cg.id)
    );
    displayedUsers = [...backendGroups, ...sessionGroups];
  }

  // Sort users based on chat order and last messages (most recent conversation appears first)
  displayedUsers = displayedUsers.sort((a, b) => {
    const aOrder = chatOrder[a.id] || 0;
    const bOrder = chatOrder[b.id] || 0;
    
    // Get last message timestamps
    const aLastMsg = lastMessages[a.id];
    const bLastMsg = lastMessages[b.id];
    const aLastMsgTime = aLastMsg ? new Date(aLastMsg.createdAt).getTime() : 0;
    const bLastMsgTime = bLastMsg ? new Date(bLastMsg.createdAt).getTime() : 0;
    
    // Use the most recent timestamp between chatOrder and lastMessage
    const aFinalTime = Math.max(aOrder, aLastMsgTime);
    const bFinalTime = Math.max(bOrder, bLastMsgTime);
    
    // If both have timestamps, sort by most recent first
    if (aFinalTime && bFinalTime) {
      return bFinalTime - aFinalTime;
    }
    
    // If only one has a timestamp, it goes first
    if (aFinalTime && !bFinalTime) return -1;
    if (!aFinalTime && bFinalTime) return 1;
    
    // If neither has a timestamp, maintain original order
    return 0;
  });

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Chat List */}
      <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-in-out md:ml-8 ${selectedChat ? 'hidden md:block' : 'block'}`}>
        <div className="overflow-y-auto h-full custom-scrollbar">


          {activeTab === 'groups' && displayedUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8">There is no group chat</div>
          ) : (
            displayedUsers.map((user) => {
              return (
              <div
                key={user.id}
                onClick={() => handleChatSelect(user)}
                className={`flex items-center p-4 transition-all duration-200 cursor-pointer hover:bg-gray-50/80 ${selectedChat?.id === user.id ? 'bg-purple-50' : ''}`}
              >
                <div className="flex items-center w-full">
                  <div className="relative flex-shrink-0">
                    {user.isGroup ? (
                      <img
                        src={user.groupImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8B5CF6&color=fff`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                      />
                    ) : (
                      <img
                        src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                      />
                    )}
                    <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(user.id) || user.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{user.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${onlineUsers.has(user.id) || user.isOnline === true ? 'text-green-500' : 'text-gray-400'} transition-colors duration-300 flex items-center`}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${onlineUsers.has(user.id) || user.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                        {onlineUsers.has(user.id) || user.isOnline === true ? 'Online' : 'Offline'}
                      </p>
                      {formatLastMessage(user.id) && (
                        <p className="text-xs text-gray-500 truncate ml-2 max-w-[120px]">
                          {formatLastMessage(user.id)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Unread count badge for groups */}
                  {user.isGroup && groupUnreadCounts[user.id] > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px] h-5">
                        {groupUnreadCounts[user.id] > 10 ? '10+' : groupUnreadCounts[user.id]}
                      </span>
                    </div>
                  )}
                  
                  {/* Unread count badge for 1-on-1 chats */}
                  {!user.isGroup && userUnreadCounts[user.id] > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px] h-5">
                        {userUnreadCounts[user.id] > 10 ? '10+' : userUnreadCounts[user.id]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full min-h-0">
        {selectedChat ? (
          selectedChat.isGroup ? (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:ml-8 md:mr-4 overflow-hidden h-full">
              <GroupChat 
                group={selectedChat} 
                onBack={() => setSelectedChat(null)}
                onGroupUpdate={handleGroupUpdate}
              />
            </div>
          ) : (
          <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:ml-8 md:mr-4 overflow-hidden transform transition-all duration-300 ease-in-out">

            
            {/* Header */}
            <div className="flex-none border-b border-gray-100 p-4 flex items-center justify-between bg-white">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden mr-2 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <img
                  src={selectedChat.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}`}
                  alt={selectedChat.name}
                  className="w-12 h-12 rounded-full ring-2 ring-purple-100"
                />
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedChat.name}</h2>
                  <p className={`text-xs flex items-center ${onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'text-green-500' : 'text-gray-400'} transition-colors duration-300`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                    {onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-[80px] md:mb-0 relative" ref={headerMenuRef}>
                <button className="p-2 hover:bg-gray-100 rounded-full"><PhoneIcon className="h-5 w-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-100 rounded-full" onClick={videocall}><VideoCameraIcon className="h-5 w-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-100 rounded-full" onClick={() => setHeaderMenuOpen((v) => !v)}>
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                </button>
                {headerMenuOpen && (
                  <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-40 flex flex-col animate-fadeIn">
                    <button 
                      className="px-4 py-2 text-left text-sm hover:bg-blue-100 text-blue-600 font-semibold" 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔥 Clear Chat button clicked!');
                        handleClearChat();
                      }}
                    >
                      Clear Chat
                    </button>
                    <button 
                      className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" 
                      type="button"
                      onClick={() => {
                        alert('Block button clicked!');
                        console.log('Block clicked');
                      }}
                    >
                      Block
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 bg-gray-50">
              <div className="space-y-4">
                {Array.isArray(messages) && messages.length > 0 && messages.map((msg) => {
                  const isSent = msg?.sender?.id === sender?.id;
                  let quoted = null;
                  let mainText = msg.message;
                  if (msg.message && msg.message.startsWith('> ')) {
                    const split = msg.message.split('\n');
                    quoted = split[0].replace('> ', '');
                    mainText = split.slice(1).join('\n');
                  }
                  // Mobile long-press handlers
                  const handleTouchStart = () => {
                    if (window.innerWidth < 768) {
                      const timer = setTimeout(() => {
                        setMobileMenuMsgId(msg.id);
                      }, 500);
                      setTouchTimer(timer);
                    }
                  };
                  const handleTouchEnd = () => {
                    if (window.innerWidth < 768 && touchTimer) {
                      clearTimeout(touchTimer);
                      setTouchTimer(null);
                    }
                  };
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'} relative`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { setHoveredMsgId(null); setOpenMenuMsgId(null); }}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* For sent messages, arrow/menu on left; for received, on right (desktop only) */}
                      {isSent && hoveredMsgId === msg.id && (
                        <div className="hidden md:flex items-center mr-2 relative">
                          <button
                            className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition-transform duration-200 ${openMenuMsgId === msg.id ? 'rotate-180' : ''}`}
                            onClick={e => { e.stopPropagation(); setOpenMenuMsgId(msg.id); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openMenuMsgId === msg.id && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                              style={{ right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px', animation: 'fadeInLeft 0.2s' }}
                            >
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setOpenMenuMsgId(null); }}>Reply</button>
                              {msg.sender.id === sender?.id && (
                                <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setOpenMenuMsgId(null); }}>Delete</button>
                              )}
                              <button className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" type="button">Block</button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isSent ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2`}>
                        {quoted && (
                          <div className="text-xs text-purple-300 border-l-4 border-purple-400 pl-2 mb-1 whitespace-pre-line">{quoted}</div>
                        )}
                        
                        {/* Media content */}
                        {msg.media && (
                          <div className="mb-2">
                            {msg.media.type === 'image' && (
                              <img 
                                src={msg.media.url} 
                                alt={msg.media.filename}
                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.media.url, '_blank')}
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {msg.media.type === 'gif' && (
                              <img 
                                src={msg.media.url} 
                                alt={msg.media.filename}
                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.media.url, '_blank')}
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {msg.media.type === 'video' && (
                              <video 
                                src={msg.media.url} 
                                controls
                                className="max-w-full h-auto rounded-lg"
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {(msg.media.type === 'audio' || msg.media.type?.startsWith('audio/') || msg.media.filename?.endsWith('.webm') || msg.media.filename?.endsWith('.mp3') || msg.media.filename?.endsWith('.wav') || msg.media.filename?.endsWith('.ogg')) && (
                              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 max-w-xs">
                                <button
                                  onClick={() => toggleAudioPlayback(msg.id, msg.media.url)}
                                  className="flex items-center justify-center w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors"
                                >
                                  {playingAudio === msg.id ? (
                                    <Pause size={18} className="text-white" />
                                  ) : (
                                    <Play size={18} className="text-white ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">🎵 Voice message</span>
                                    <span className="text-xs text-gray-500">
                                      {formatAudioTime(audioProgress[msg.id] || 0)} / {formatAudioTime(audioDuration[msg.id] || 0)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${audioDuration[msg.id] ? (audioProgress[msg.id] / audioDuration[msg.id]) * 100 : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {msg.media.type === 'file' && (
                              <div className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{msg.media.filename}</p>
                                  <p className="text-xs opacity-70">{(msg.media.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button 
                                  onClick={() => window.open(msg.media.url, '_blank')}
                                  className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Shared Content */}
                        {(() => {
                          try {
                            const parsedMessage = JSON.parse(mainText || '{}');
                            if (parsedMessage.type === 'shared_post' || parsedMessage.type === 'shared_reel') {
                              return <SharedContent messageData={parsedMessage} />;
                            }
                          } catch (e) {
                            // Not a JSON message, continue with regular text
                          }
                          return null;
                        })()}
                        
                        {/* Text message */}
                        {(() => {
                          try {
                            const parsedMessage = JSON.parse(mainText || '{}');
                            if (parsedMessage.type === 'shared_post' || parsedMessage.type === 'shared_reel') {
                              return null; // Don't show text for shared content
                            }
                          } catch (e) {
                            // Not a JSON message, show as regular text
                          }
                          return mainText && <p className="text-sm whitespace-pre-line">{mainText}</p>;
                        })()}
                        
                        <span className={`text-xs mt-1 block ${isSent ? 'text-purple-200' : 'text-gray-500'}`}>
                          {moment(msg.createdAt).format('hh:mm A')}
                        </span>
                      </div>
                      {!isSent && hoveredMsgId === msg.id && (
                        <div className="hidden md:flex items-center ml-2 relative">
                          <button
                            className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition-transform duration-200 ${openMenuMsgId === msg.id ? 'rotate-180' : ''}`}
                            onClick={e => { e.stopPropagation(); setOpenMenuMsgId(msg.id); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openMenuMsgId === msg.id && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                              style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px', animation: 'fadeInLeft 0.2s' }}
                            >
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setOpenMenuMsgId(null); }}>Reply</button>
                              {msg.sender.id === sender?.id && (
                                <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setOpenMenuMsgId(null); }}>Delete</button>
                              )}
                              <button className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" type="button">Block</button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Mobile: show options on long press */}
                      {mobileMenuMsgId === msg.id && (
                        <div className="md:hidden absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'fadeInLeft 0.2s' }}
                        >
                          <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setMobileMenuMsgId(null); }}>Reply</button>
                          {msg.sender.id === sender?.id && (
                            <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setMobileMenuMsgId(null); }}>Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Typing indicator for 1-on-1 chats */}
                {typingUser && selectedChat && !selectedChat.isGroup && (
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={typingUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(typingUser.userName)}&background=8B5CF6&color=fff`}
                      alt={typingUser.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-sm text-gray-600">typing...</span>
                  </div>
                )}
                
                {/* Invisible div for auto-scroll reference */}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* Input - always at bottom, never scrolls */}
            <div className="flex-none border-t border-gray-100 p-4 bg-white relative z-10">
              {/* Reply mention UI */}
              {replyToMsg && (
                <div className="flex items-center mb-2 px-3 py-1 rounded-lg bg-purple-50 border-l-4 border-purple-400">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-purple-700 font-semibold">Replying to:</span>
                    <span className="block text-xs text-gray-700 truncate max-w-xs">{replyToMsg.message}</span>
                  </div>
                  <button className="ml-2 p-1 rounded-full hover:bg-purple-100" onClick={() => setReplyToMsg(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              
              {/* File Preview Area */}
              {selectedFile && (
                <div className="mb-3 relative">
                  <div className="relative inline-block">
                    {selectedFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                      />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <video
                        src={URL.createObjectURL(selectedFile)}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                        muted
                      />
                    ) : (
                      <div className="w-20 h-20 bg-purple-100 rounded-lg border-2 border-purple-200 shadow-sm flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Remove button overlay */}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        console.log("📁 File selection cleared");
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 relative">
                <button
                  className="p-1.5 hover:bg-gray-100 rounded-full relative"
                  onClick={() => {
                    console.log("📎 Attachment button clicked! Current showAttachmentBar:", showAttachmentBar);
                    setShowAttachmentBar((prev) => !prev);
                  }}
                  type="button"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  ) : (
                    <PaperClipIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                {showAttachmentBar && (
                  <div className="absolute left-0 bottom-full mb-2 z-50 flex flex-col bg-white rounded-lg shadow-lg p-2">
                    <button
                      className="group p-1 rounded-xl bg-gradient-to-br from-white/80 to-purple-50 flex flex-col items-center gap-0.5 hover:bg-purple-100 hover:scale-105"
                      type="button"
                      onClick={() => {
                        if (photoInputRef.current) photoInputRef.current.click();
                      }}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 group-hover:text-purple-800 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity=".08" />
                          <circle cx="8" cy="9" r="1.5" fill="currentColor" />
                          <path d="M21 19l-5.5-7-4.5 6-3-4L3 19" stroke="currentColor" strokeWidth="1.2" fill="none" />
                        </svg>
                      </span>
                      <span className="text-[9px] font-semibold text-purple-700 group-hover:text-purple-900 tracking-wide transition-all duration-150">Photo</span>
                    </button>
                    <button
                      className="group p-1 rounded-xl bg-gradient-to-br from-white/80 to-purple-50 flex flex-col items-center gap-0.5 hover:bg-purple-100 hover:scale-105 mt-1"
                      type="button"
                      onClick={() => {
                        if (videoInputRef.current) videoInputRef.current.click();
                      }}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 group-hover:text-purple-800 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <span className="text-[9px] font-semibold text-purple-700 group-hover:text-purple-900 tracking-wide transition-all duration-150">Video</span>
                    </button>
                    <button
                      className="group p-1 rounded-xl bg-gradient-to-br from-white/80 to-purple-50 flex flex-col items-center gap-0.5 hover:bg-purple-100 hover:scale-105 mt-1"
                      type="button"
                      onClick={() => setShowGifPicker(true)}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 group-hover:text-purple-800 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity=".08" />
                          <polygon points="10,9 16,12 10,15" fill="currentColor" />
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      </span>
                      <span className="text-[9px] font-semibold text-purple-700 group-hover:text-purple-900 tracking-wide transition-all duration-150">GIF</span>
                    </button>
                  </div>
                )}
                <div className="relative flex-1">
                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="flex items-center justify-center mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-600">
                          Recording... {formatRecordingTime(recordingTime)}
                        </span>
                        <button
                          onClick={cancelRecording}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audio Preview */}
                  {recordedAudio && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-16 h-16 bg-green-100 rounded-lg border-2 border-green-200 shadow-sm flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          {/* Remove button overlay */}
                          <button
                            onClick={cancelAudioPreview}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">Voice Message</p>
                          <p className="text-xs text-green-600">{formatRecordingTime(recordedAudio.duration)}</p>
                          <div className="mt-2">
                            <audio controls className="w-full h-8">
                              <source src={recordedAudio.url} type="audio/webm" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={recordedAudio ? audioMessage : text}
                        onChange={(q) => { 
                          if (recordedAudio) {
                            setAudioMessage(q.target.value);
                          } else {
                            handleTyping(q);
                          }
                        }}
                        onKeyDown={(e) => {
                          try {
                            if (e.key === 'Enter' && (recordedAudio || selectedFile || text.trim())) {
                              e.preventDefault();
                              chat();
                            }
                          } catch (error) {
                            console.error("Error while sending message on Enter key:", error);
                          }
                        }}
                        placeholder={
                          recordedAudio 
                            ? "Add a message to your voice note..." 
                            : selectedFile 
                              ? "Add a caption to your image..." 
                              : "Type a message..."
                        }
                        className="w-full border border-gray-200 rounded-full px-3 py-1.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      
                      {/* Emoji Button */}
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 hover:text-purple-500 focus:outline-none"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                      >
                        <BsEmojiSmile />
                      </button>
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50 bg-white shadow-lg rounded-lg p-2 relative">
                          {/* Close Button */}
                          <button
                            onClick={() => setShowEmojiPicker(false)}
                            className="absolute top-1 right-1 text-gray-500 hover:text-red-500 z-10"
                          >
                            <X size={16} />
                          </button>

                          <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            theme="light"
                          />
                        </div>
                      )}
                    </div>

                    <button className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center" type="button" onClick={() => {
                      if (isRecording) {
                        stopRecording();
                      } else {
                        startRecording();
                      }
                    }}>
                      {/* Show stop icon if recording, else mic icon */}
                      {isRecording ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="8" y="8" width="8" height="8" rx="2" fill="white" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="9" y="5" width="6" height="8" rx="3" fill="white" />
                          <path d="M12 17v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M8 13a4 4 0 008 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12" cy="9" r="3" fill="white" />
                        </svg>
                      )}
                    </button>
                    <button 
                      className={`p-2 text-white rounded-full transition-colors duration-200 flex items-center justify-center ${
                        recordedAudio
                          ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                          : selectedFile 
                            ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                            : 'bg-purple-600 hover:bg-purple-700'
                      }`} 
                      type="button"
                      onClick={chat}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : recordedAudio ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      ) : selectedFile ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      ) : (
                        <PaperAirplaneIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {showGifPicker && (
                    <div className="absolute left-0 right-0 top-full z-[99999] mt-2">
                      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-2xl mx-auto max-w-md w-full min-h-[300px]">
                        <button 
                          onClick={() => setShowGifPicker(false)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
                        >
                          ×
                        </button>
                        <GifSelector onSelect={handleGifSelect} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-white ml-8 mr-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-center animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-0.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No chat selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select a user to start messaging</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden file input for photo selection */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      {/* Hidden file input for video selection */}
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoSelect}
        accept="video/*"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ChatList;




  