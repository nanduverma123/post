import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_GROUP_MESSAGES, SEND_GROUP_MESSAGE, SEND_GROUP_MESSAGE_WITH_FILE, GET_ME, DELETE_GROUP_MESSAGE, MARK_GROUP_MESSAGE_AS_READ, REMOVE_GROUP_MEMBER, GET_USER_GROUPS, GET_ALL_USERS, ADD_GROUP_MEMBERS } from '../../graphql/mutations';
import socket from '../socket_io/Socket';
import { X, Paperclip, Image, FileText, Reply, MoreVertical, Trash2, Video, Users, Crown, UserMinus, Mic, MicOff, Square, Play, Pause } from "lucide-react";
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import GifSelector from './GifPicker';

const GroupChat = ({ group, onBack, onGroupUpdate }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Media and attachment states
  const [showAttachmentBar, setShowAttachmentBar] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  // Reply functionality states
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  
  // Dropdown menu states
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);
  
  // Group members modal state
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  // Add members modal state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Removed from group state
  const [isRemovedFromGroup, setIsRemovedFromGroup] = useState(false);
  const [removalMessage, setRemovalMessage] = useState('');
  
  // Refs for file inputs
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const attachmentBarRef = useRef(null);
  
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

  const { data: currentUserData } = useQuery(GET_ME);
  const { data: messagesData, loading } = useQuery(GET_GROUP_MESSAGES, {
    variables: { groupId: group._id, limit: 50, offset: 0 },
    skip: !group._id
  });
  const { data: usersData } = useQuery(GET_ALL_USERS);

  const [sendGroupMessage] = useMutation(SEND_GROUP_MESSAGE);
  const [sendGroupMessageWithFile] = useMutation(SEND_GROUP_MESSAGE_WITH_FILE);
  const [deleteGroupMessage] = useMutation(DELETE_GROUP_MESSAGE);
  const [markGroupMessageAsRead] = useMutation(MARK_GROUP_MESSAGE_AS_READ);
  const [removeGroupMember] = useMutation(REMOVE_GROUP_MEMBER);
  const [addGroupMembers] = useMutation(ADD_GROUP_MEMBERS);

  // Search users function
  const searchUsers = (query) => {
    if (!query.trim() || !usersData?.users) {
      setSearchResults([]);
      return;
    }

    const currentMemberIds = group.members.map(member => member.id);
    const filteredUsers = usersData.users.filter(user => 
      !currentMemberIds.includes(user.id) && // Exclude current members
      user.id !== currentUserData?.getMe?.id && // Exclude current user
      ((user.name && user.name.toLowerCase().includes(query.toLowerCase())) || 
       (user.username && user.username.toLowerCase().includes(query.toLowerCase())))
    );
    
    setSearchResults(filteredUsers);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  // Toggle user selection
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Add selected members to group
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const memberIds = selectedUsers.map(user => user.id);
      const response = await addGroupMembers({
        variables: {
          groupId: group._id,
          memberIds: memberIds
        }
      });

      if (response.data?.addGroupMembers?.success) {
        // Update group data with fresh members list from response
        const updatedGroup = response.data.addGroupMembers.group;
        if (onGroupUpdate && updatedGroup) {
          onGroupUpdate({
            ...updatedGroup,
            id: updatedGroup._id,
            isGroup: true,
            profileImage: group.groupImage || group.profileImage,
            admin: group.admin // Keep existing admin info
          });
        }
        
        // Reset states
        setSelectedUsers([]);
        setSearchQuery('');
        setSearchResults([]);
        setShowAddMembersModal(false);
      }
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Error adding members to group');
    }
  };

  useEffect(() => {
    if (messagesData?.getGroupMessages) {
      setMessages(messagesData.getGroupMessages);
    }
  }, [messagesData]);

  useEffect(() => {
    if (group._id) {
      // Join group room
      socket.joinGroup(group._id);

      // Listen for new messages
      socket.on('newGroupMessage', (newMessage) => {
        if (newMessage.group._id === group._id) {
          setMessages(prev => [...prev, newMessage]);
        }
      });

      // Listen for typing indicators
      socket.on('groupUserTyping', ({ userId, userName, profileImage, isTyping: userIsTyping }) => {
        if (userId !== currentUserData?.getMe?.id) {
          setTypingUsers(prev => {
            if (userIsTyping) {
              return [...prev.filter(u => u.userId !== userId), { userId, userName, profileImage }];
            } else {
              return prev.filter(u => u.userId !== userId);
            }
          });
        }
      });

      // Listen for message deletions
      socket.on('groupMessageDeleted', ({ messageId, groupId }) => {
        if (groupId === group._id) {
          console.log('🗑️ Message deleted remotely:', messageId);
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        }
      });

      // Listen for member being removed from group
      socket.on('groupMemberRemoved', ({ group: updatedGroup, removedMember }) => {
        console.log('🚨 GroupMemberRemoved event received!');
        console.log('👥 Removed member ID:', removedMember);
        console.log('🔄 Updated group data:', updatedGroup);
        console.log('📞 onGroupUpdate callback available:', !!onGroupUpdate);
        
        // Update parent component with new group data
        if (onGroupUpdate && updatedGroup) {
          console.log('✅ Calling onGroupUpdate with updated group');
          onGroupUpdate({
            ...updatedGroup,
            id: updatedGroup._id,
            isGroup: true,
            profileImage: updatedGroup.groupImage
          });
        } else {
          console.log('❌ Cannot update group - missing callback or data');
        }
      });

      // Listen for being removed from group chat (real-time notice)
      socket.on('removedFromGroupChat', ({ groupId, groupName, message }) => {
        if (groupId === group._id) {
          setIsRemovedFromGroup(true);
          setRemovalMessage(message);
          // Clear any selected file and close modals
          setSelectedFile(null);
          setShowAttachmentBar(false);
          setShowGifPicker(false);
          setShowEmojiPicker(false);
        }
      });

      // Listen for being removed from group (for groups list)
      socket.on('removedFromGroup', ({ groupId, groupName, message }) => {
        // Refetch removed groups data to update UI
        // Removed window.location.reload() - no page refresh needed
      });

      return () => {
        socket.leaveGroup(group._id);
        socket.off('newGroupMessage');
        socket.off('groupUserTyping');
        socket.off('groupMessageDeleted');
        socket.off('groupMemberRemoved');
        socket.off('removedFromGroupChat');
        socket.off('removedFromGroup');
      };
    }
  }, [group._id, currentUserData?.getMe?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when they are loaded
  useEffect(() => {
    if (messages.length > 0 && currentUserData?.getMe?.id) {
      const unreadMessages = messages.filter(msg => 
        msg.sender.id !== currentUserData.getMe.id && 
        !msg.readBy?.some(read => read.user.id === currentUserData.getMe.id)
      );

      // Mark unread messages as read
      unreadMessages.forEach(async (msg) => {
        try {
          await markGroupMessageAsRead({
            variables: { messageId: msg._id }
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    }
  }, [messages, currentUserData?.getMe?.id, markGroupMessageAsRead]);

  // Close attachment bar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentBarRef.current && !attachmentBarRef.current.contains(event.target)) {
        setShowAttachmentBar(false);
      }
    };

    if (showAttachmentBar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentBar]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if component unmounts
      if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
      }
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, mediaRecorder]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // If user is removed from group, don't allow sending messages
    if (isRemovedFromGroup) {
      return;
    }
    
    // Check if we have recorded audio to send
    if (recordedAudio) {
      console.log("🎤 Sending recorded audio with message:", audioMessage);
      await sendAudioMessage();
      return;
    }
    
    // If there's a selected file, send media message
    if (selectedFile) {
      await sendMediaMessage(selectedFile, message.trim());
      return;
    }
    
    // If no message text, don't send
    if (!message.trim()) return;

    try {
      console.log('🚀 Sending message with reply:', {
        groupId: group._id,
        content: message.trim(),
        replyTo: replyToMsg?._id || replyToMsg?.id || null
      });
      
      await sendGroupMessage({
        variables: {
          groupId: group._id,
          content: message.trim(),
          messageType: 'text',
          replyTo: replyToMsg?._id || replyToMsg?.id || null
        }
      });
      setMessage('');
      setReplyToMsg(null);
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.sendGroupTyping(group._id, true, currentUserData?.getMe?.name);
      
      setTimeout(() => {
        setIsTyping(false);
        socket.sendGroupTyping(group._id, false, currentUserData?.getMe?.name);
      }, 2000);
    }
  };

  const handleEmojiSelect = (event, emojiObject) => {
    const emoji = emojiObject?.emoji || event?.emoji;
    if (recordedAudio) {
      setAudioMessage((prev) => prev + emoji);
    } else {
      setMessage((prev) => prev + emoji);
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

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      event.target.value = '';
      return;
    }

    // If it's a video, validate duration
    if (file.type.startsWith('video/')) {
      const isValidDuration = await validateVideoDuration(file);
      if (!isValidDuration) {
        alert("Video duration should be less than 60 seconds");
        event.target.value = '';
        return;
      }
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    console.log("📁 File selected for group chat:", file.name);
    event.target.value = '';
  };

  // Handle video selection
  const handleVideoSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate video duration (only check duration, no file size limit)
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
      alert("Video duration should be less than 60 seconds");
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    console.log("🎥 Video selected for group chat:", file.name);
    event.target.value = '';
  };

  // Handle GIF selection
  const handleGifSelect = (gif) => {
    try {
      console.log("🎬 GIF selected for group chat:", gif);
      
      const gifData = {
        url: gif.url || gif.images?.original?.url,
        type: 'gif',
        filename: `gif-${Date.now()}.gif`,
        size: gif.images?.original?.size || 0,
        isGif: true
      };

      setSelectedFile(gifData);
      setShowGifPicker(false);
      console.log("🎬 GIF ready for group chat:", gifData.filename);
      
    } catch (error) {
      console.error("❌ Error selecting GIF for group:", error);
      alert("GIF select karne mein error aaya");
    }
  };

  // Send media message to group
  const sendMediaMessage = async (file, caption = '') => {
    console.log("🚀 === GROUP MEDIA MESSAGE SEND START ===");
    
    if (!group?.id || !currentUserData?.getMe?.id) {
      console.error("❌ Missing group or user data");
      alert("Group ya User data missing hai");
      return;
    }

    setIsUploading(true);
    
    const isGif = file?.isGif || false;
    
    try {
      if (isGif) {
        // For GIFs, use sendGroupMessage with media data
        const mediaData = {
          url: file.url,
          type: 'gif',
          filename: file.filename,
          size: file.size
        };

        console.log("📤 Sending group GIF message:", mediaData);
        
        const response = await sendGroupMessage({
          variables: {
            groupId: group._id,
            content: caption || null,
            messageType: 'gif',
            media: mediaData,
            replyTo: replyToMsg?._id || replyToMsg?.id || null
          }
        });

        if (response?.data?.sendGroupMessage) {
          console.log("✅ Group GIF message sent successfully");
          setSelectedFile(null);
          setReplyToMsg(null);
          setMessage('');
        }
      } else {
        // For regular files, use sendGroupMessageWithFile for upload
        console.log("📤 Sending group file message:", file.name);
        
        const response = await sendGroupMessageWithFile({
          variables: {
            groupId: group._id,
            content: caption || null,
            file: file,
            replyTo: replyToMsg?._id || replyToMsg?.id || null
          }
        });

        if (response?.data?.sendGroupMessageWithFile) {
          console.log("✅ Group file message sent successfully");
          setSelectedFile(null);
          setReplyToMsg(null);
          setMessage('');
        }
      }
      
    } catch (error) {
      console.error("❌ Error sending group media message:", error);
      console.error("❌ Full error details:", error.message, error.graphQLErrors, error.networkError);
      
      let errorMessage = "Group mein media send karne mein error aaya";
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        errorMessage = "Network error: " + error.networkError.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle reply to message
  const handleReplyToMessage = (msg) => {
    setReplyToMsg(msg);
    console.log("💬 Replying to group message:", msg._id, "Content:", msg.content, "Sender:", msg.sender.name);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyToMsg(null);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Do you want to delete this Message?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting group message:', messageId);
      
      await deleteGroupMessage({
        variables: { messageId }
      });

      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setShowDropdown(null);
      
      console.log('✅ Group message deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting group message:', error);
      alert('Message delete karne mein error aaya');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      return;
    }

    try {
      const result = await removeGroupMember({
        variables: {
          groupId: group._id,
          memberId: memberId
        },
        update: (cache, { data }) => {
          if (data?.removeGroupMember?.success && data?.removeGroupMember?.group) {
            // Update the cache with the new group data
            const updatedGroup = data.removeGroupMember.group;
            
            // Update GET_USER_GROUPS cache
            try {
              const existingData = cache.readQuery({
                query: GET_USER_GROUPS,
                variables: { userId: currentUserData?.me?.id }
              });
              
              if (existingData?.getUserGroups) {
                const updatedGroups = existingData.getUserGroups.map(g => 
                  g._id === updatedGroup._id ? { ...g, ...updatedGroup } : g
                );
                
                cache.writeQuery({
                  query: GET_USER_GROUPS,
                  variables: { userId: currentUserData?.me?.id },
                  data: { getUserGroups: updatedGroups }
                });
              }
            } catch (e) {
              console.log('Cache update failed:', e);
            }
          }
        }
      });

      if (result.data?.removeGroupMember?.success) {
        alert(`${memberName} has been removed from the group`);
        // Socket event will handle the UI update
      } else {
        alert(result.data?.removeGroupMember?.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('❌ Error removing group member:', error);
      alert('Failed to remove member from group');
    }
  };

  // Handle dropdown toggle
  const toggleDropdown = (messageId) => {
    setShowDropdown(showDropdown === messageId ? null : messageId);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    // Show full date and time in a readable format
    return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      console.log('🎤 Current recording state:', isRecording);
      
      // Check if browser supports MediaRecorder
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
        
        // Create audio file object
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
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      recorder.start();
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('❌ Error details:', error.name, error.message);
      
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
      
      // Clear timer
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
      
      // Stop all tracks
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setIsRecording(false);
    setRecordingTime(0);
    setAudioChunks([]);
    setRecordedAudio(null);
    setAudioMessage("");
    
    // Clear timer
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
        // Send audio message
        await sendGroupMessageWithFile({
          variables: {
            groupId: group._id,
            content: audioMessage.trim() || null,
            file: recordedAudio.file,
            replyTo: replyToMsg?._id || null
          }
        });
        
        console.log('✅ Audio message sent successfully');
        
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
        // Send audio message
        await sendGroupMessageWithFile({
          variables: {
            groupId: group._id,
            content: message.trim() || null,
            file: audioFile,
            replyTo: replyToMsg?._id || null
          }
        });
        
        console.log('✅ Audio message sent successfully');
        setMessage('');
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

  // Test function to check browser support
  const testAudioSupport = () => {
    console.log('🔍 Testing audio support...');
    console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    console.log('MediaRecorder:', !!window.MediaRecorder);
    console.log('Location protocol:', window.location.protocol);
    console.log('Is HTTPS:', window.location.protocol === 'https:');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log('✅ Audio recording should be supported');
    } else {
      console.log('❌ Audio recording not supported');
    }
  };

  // Simple test function
  const testMicAccess = async () => {
    try {
      console.log('🧪 Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted!');
      stream.getTracks().forEach(track => track.stop());
      alert('Microphone test successful!');
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      alert(`Microphone test failed: ${error.message}`);
    }
  };

  // Test on component mount
  useEffect(() => {
    testAudioSupport();
  }, []);

  // Audio playback functions
  const toggleAudioPlayback = (messageId, audioUrl) => {
    const audio = audioRefs.current[messageId];
    
    if (!audio) {
      // Create new audio element
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
      
      // Start playing
      newAudio.play();
      setPlayingAudio(messageId);
    } else {
      // Toggle existing audio
      if (playingAudio === messageId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        // Pause any other playing audio
        Object.values(audioRefs.current).forEach(a => a.pause());
        setPlayingAudio(null);
        
        // Play this audio
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-white shadow-sm">
        <button
          onClick={onBack}
          className="mr-3 p-2 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div 
          className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
          onClick={() => setShowMembersModal(true)}
        >
          <img
            src={group.groupImage || group.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=8B5CF6&color=fff`}
            alt={group.name}
            className="w-10 h-10 rounded-full mr-3 object-cover"
          />
          <div>
            <h3 className="font-semibold">{group.name}</h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {group.memberCount} members
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Removal Notice */}
        {isRemovedFromGroup && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 font-medium">
                  {removalMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.filter(msg => !msg.isDeleted).map((msg) => {
          const senderId = msg.sender._id || msg.sender.id;
          const currentUserId = currentUserData?.getMe?.id;
          const isOwnMessage = senderId === currentUserId;
          
          // Check if this message has been replied to
          const hasBeenReplied = messages.some(m => m.replyTo?._id === msg._id || m.replyTo?.id === msg._id);
          
          return (
            <div
              key={msg._id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              onMouseEnter={() => setHoveredMsgId(msg._id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              <div className="flex flex-col items-start relative">
                {!isOwnMessage && (
                  <img
                    src={msg.sender.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}&background=8B5CF6&color=fff`}
                    alt={msg.sender.name}
                    className="w-7 h-7 rounded-full mb-1 object-cover"
                  />
                )}
                
                {/* Dropdown button */}
                {hoveredMsgId === msg._id && (
                  <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button
                      onClick={() => toggleDropdown(msg._id)}
                      className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                      title="More options"
                    >
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showDropdown === msg._id && (
                      <div 
                        ref={dropdownRef}
                        className={`absolute ${isOwnMessage ? 'right-8' : 'left-8'} top-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-28`}
                      >
                        <button
                          onClick={() => {
                            handleReplyToMessage(msg);
                            setShowDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Reply size={14} />
                          <span>Reply</span>
                        </button>
                        
                        {/* Only show delete if it's user's own message */}
                        {isOwnMessage && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`${
                  // For image/gif/video messages, use minimal padding and fit content
                  msg.media && (msg.media.type === 'image' || msg.media.type === 'gif' || msg.media.type === 'video') && !msg.content && !msg.replyTo
                    ? 'py-2 pl-3 pr-1 inline-block'
                    : 'max-w-xs lg:max-w-md px-4 py-2'
                } rounded-lg ${
                  isOwnMessage
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1">{msg.sender.name}</p>
                  )}
                  
                  {/* Reply indicator */}
                  {msg.replyTo && (
                    <div className={`mb-2 p-2 rounded border-l-4 ${
                      isOwnMessage 
                        ? 'bg-purple-400 border-purple-200' 
                        : 'bg-gray-100 border-gray-400'
                    }`}>
                      <p className={`text-xs font-medium ${isOwnMessage ? 'text-purple-100' : 'text-gray-700'}`}>
                        {msg.replyTo.sender?.name || 'Unknown User'}
                      </p>
                      <p className={`text-xs ${isOwnMessage ? 'text-purple-100' : 'text-gray-600'} mt-1`}>
                        {msg.replyTo.content || 'Media message'}
                      </p>
                    </div>
                  )}
                  
                  {/* Media content */}
                  {msg.media && (
                    <div className="mb-2">
                      {msg.media.type === 'image' || msg.media.type === 'gif' ? (
                        <img
                          src={msg.media.url}
                          alt={msg.media.filename}
                          className="h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxWidth: '80%', maxHeight: '200px' }}
                          onClick={() => window.open(msg.media.url, '_blank')}
                        />
                      ) : msg.media.type === 'video' ? (
                        <video
                          src={msg.media.url}
                          controls
                          className="h-auto rounded-lg"
                          style={{ maxWidth: '80%', maxHeight: '200px' }}
                        />
                      ) : (msg.media.type === 'audio' || msg.media.type?.startsWith('audio/') || msg.media.filename?.endsWith('.webm') || msg.media.filename?.endsWith('.mp3') || msg.media.filename?.endsWith('.wav') || msg.media.filename?.endsWith('.ogg')) ? (
                        <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 max-w-xs">
                          <button
                            onClick={() => toggleAudioPlayback(msg._id, msg.media.url)}
                            className="flex items-center justify-center w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors"
                          >
                            {playingAudio === msg._id ? (
                              <Pause size={18} className="text-white" />
                            ) : (
                              <Play size={18} className="text-white ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">🎵 Voice message</span>
                              <span className="text-xs text-gray-500">
                                {formatAudioTime(audioProgress[msg._id] || 0)} / {formatAudioTime(audioDuration[msg._id] || 0)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${audioDuration[msg._id] ? (audioProgress[msg._id] / audioDuration[msg._id]) * 100 : 0}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <FileText size={20} />
                          <span className="text-sm">{msg.media.filename}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Text content */}
                  {msg.content && <p>{msg.content}</p>}
                  
                  <div className={`flex items-center justify-between mt-1`}>
                    <p className={`text-xs ${
                      isOwnMessage ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.createdAt)}
                    </p>
                    {hasBeenReplied && (
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-purple-200' : 'text-gray-400'
                      }`}>
                        <Reply size={12} className="inline" /> replied
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 mb-2">
            {typingUsers.map((u) => (
              <img
                key={u.userId}
                src={u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=8B5CF6&color=fff`}
                alt={u.userName}
                className="w-6 h-6 rounded-full object-cover"
              />
            ))}
            <span className="text-sm text-gray-600">typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-white">
        {/* Reply indicator */}
        {replyToMsg && (
          <div className="px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Reply size={16} className="text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">
                    Replying to {replyToMsg.sender?.name || 'Unknown User'}
                  </span>
                  <span className="text-sm text-gray-700 truncate max-w-64">
                    {replyToMsg.content || 'Media message'}
                  </span>
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="text-gray-500 hover:text-red-500 ml-2"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* File preview - only show if user is not removed */}
        {!isRemovedFromGroup && selectedFile && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.isGif || selectedFile.type?.startsWith('image/') ? (
                  <div className="flex items-center space-x-2">
                    <Image size={16} className="text-blue-500" />
                    <span className="text-sm text-blue-700">
                      {selectedFile.isGif ? 'GIF' : 'Image'}: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                ) : selectedFile.type?.startsWith('video/') ? (
                  <div className="flex items-center space-x-2">
                    <Video size={16} className="text-red-500" />
                    <span className="text-sm text-red-700">
                      Video: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="text-sm text-blue-700">
                      File: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Attachment bar - only show if user is not removed */}
        {!isRemovedFromGroup && showAttachmentBar && (
          <div ref={attachmentBarRef} className="px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Image size={16} />
                <span className="text-sm">Photo</span>
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Video size={16} />
                <span className="text-sm">Video</span>
              </button>
              <button
                onClick={() => setShowGifPicker(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <span className="text-sm">🎬 GIF</span>
              </button>
            </div>
          </div>
        )}

        {/* GIF Picker - only show if user is not removed */}
        {!isRemovedFromGroup && showGifPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <div className="relative">
              <button
                onClick={() => setShowGifPicker(false)}
                className="absolute top-2 right-2 z-10 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
              <GifSelector onSelect={handleGifSelect} />
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {!isRemovedFromGroup && isRecording && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <Mic size={18} className="text-red-500" />
                  <span className="text-red-600 font-medium">Recording...</span>
                </div>
                <span className="text-red-600 font-mono text-lg">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={cancelRecording}
                  className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm flex items-center space-x-1"
                >
                  <Square size={14} />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Preview */}
        {!isRemovedFromGroup && recordedAudio && (
          <div className="px-4 py-3 bg-green-50 border-t border-green-200">
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

        {/* Show removal message if user is removed from group */}
        {isRemovedFromGroup ? (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="text-center text-red-600 font-medium">
              {removalMessage || "You have been removed from this group"}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-4">
            <div className="flex items-center space-x-2 relative">
              {/* Attachment button */}
              <button
                type="button"
                onClick={() => setShowAttachmentBar(!showAttachmentBar)}
                className="p-2 text-gray-500 hover:text-purple-500 rounded-full hover:bg-gray-100"
              >
                <Paperclip size={20} />
              </button>

              <input
                type="text"
                value={recordedAudio ? audioMessage : message}
                onChange={(e) => {
                  if (recordedAudio) {
                    setAudioMessage(e.target.value);
                  } else {
                    handleTyping(e);
                  }
                }}
                placeholder={
                  recordedAudio 
                    ? "Add a message to your voice note..." 
                    : selectedFile 
                      ? "Add a caption..." 
                      : "Type a message..."
                }
                className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 pr-32"
                disabled={isRecording}
              />
              
              {/* Mic button */}
              <button
                type="button"
                className="absolute right-28 text-gray-500 hover:text-orange-500 focus:outline-none p-1"
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                disabled={isUploading}
                title={isRecording ? "Stop recording" : "Start voice recording"}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="8" y="8" width="8" height="8" rx="2" fill="#ef4444" />
                  </svg>
                ) : (
                  <Mic size={20} />
                )}
              </button>

              {/* Emoji button */}
              <button
                type="button"
                className="absolute right-16 text-xl text-gray-500 hover:text-purple-500 focus:outline-none"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
              >
                <BsEmojiSmile />
              </button>

              {/* Send button */}
              <button
                type="submit"
                disabled={!recordedAudio && !message.trim() && !selectedFile}
                className={`p-3 text-white rounded-full transition-colors duration-200 disabled:opacity-50 ${
                  recordedAudio
                    ? 'bg-green-500 hover:bg-green-600 animate-pulse'
                    : selectedFile 
                      ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                      : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : recordedAudio ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-14 right-16 z-50 bg-white shadow-lg rounded-lg p-2 relative">
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
          </form>
        )}

        {/* Hidden file inputs - only render if user is not removed */}
        {!isRemovedFromGroup && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Group Members ({group.memberCount})
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[60vh]">
              {/* Admin Section */}
              {group.admin && (
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                    Group Administrator
                  </h3>
                  <div className="flex items-center">
                    <div className="relative">
                      <img
                        src={group.admin.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.admin.name)}`}
                        alt={group.admin.name}
                        className="w-12 h-12 rounded-full mr-3 object-cover ring-2 ring-yellow-300"
                      />
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">{group.admin.name}</p>
                      <p className="text-sm text-yellow-700 font-medium flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        Administrator • Full Control
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Members ({group.members ? group.members.length : 0})
                </h3>
                <div className="space-y-3">
                  {group.members && group.members.map((member) => {
                    const isAdmin = group.admins && group.admins.some(admin => admin.id === member.id);
                    const isCurrentUserAdmin = group.admins && group.admins.some(admin => admin.id === currentUserData?.getMe?.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center flex-1">
                          <img
                            src={member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`}
                            alt={member.name}
                            className="w-10 h-10 rounded-full mr-3 object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="font-medium text-gray-900">
                                {member.name}{isAdmin ? ' admin' : ''}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {isAdmin ? 'Group Administrator' : 'Member'}
                            </p>
                          </div>
                        </div>
                        {/* Remove button only for non-admin members and only if current user is admin */}
                        {!isAdmin && isCurrentUserAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex items-center space-x-1"
                            title={`Remove ${member.name} from group`}
                          >
                            <UserMinus className="w-4 h-4" />
                            <span className="text-xs font-medium">Remove</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Add Members Section (only for admins) */}
                {(group.admins && group.admins.some(admin => admin.id === currentUserData?.getMe?.id)) && (
                  <div className="mt-4 p-3 border-t">
                    <button
                      onClick={() => setShowAddMembersModal(true)}
                      className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Add New Members</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Add Members to {group.name}
                </h2>
                <button
                  onClick={() => {
                    setShowAddMembersModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedUsers([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users by name or username..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Selected Users ({selectedUsers.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{user.name}</span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="ml-2 hover:bg-blue-200 rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto">
                {searchQuery && searchResults.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No users found
                  </div>
                ) : (
                  searchResults.map(user => {
                    const isSelected = selectedUsers.find(u => u.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user)}
                        className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <img
                          src={user.profileImage || '/default-avatar.png'}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Button */}
              {selectedUsers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={handleAddMembers}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Add {selectedUsers.length} Member{selectedUsers.length > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;