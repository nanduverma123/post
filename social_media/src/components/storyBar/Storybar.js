import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from '@apollo/client';
import { FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { MdAddPhotoAlternate, MdRefresh, MdCheck, MdTextFields, MdEmojiEmotions, MdGif, MdBrush } from "react-icons/md";
import { TbFiltersFilled } from "react-icons/tb";
import { MdFilterAlt } from "react-icons/md";
import { RiFilter3Line } from "react-icons/ri";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Moveable from 'react-moveable';
import EmojiPicker from 'emoji-picker-react';
import GifPicker from 'gif-picker-react';
import { GET_ALL_USERS, GET_ME, ADD_STORY, UPLOAD_STORY_MEDIA, GET_USER_STORIES, DELETE_STORY } from '../../graphql/mutations';
import { GetTokenFromCookie } from '../getToken/GetToken';
import StoryViewer from '../storyViewer/StoryViewer';
import axios from 'axios';

const isMobile = () => window.innerWidth <= 768;

const StoryBar = ({ storyBarRef, scrollStories, userAvatarUrl }) => {
  // Backend integration states
  const [userStories, setUserStories] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [dailyStoryCount, setDailyStoryCount] = useState(0);
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0); // Force re-render when profile images change
  const [cachedProfileImage, setCachedProfileImage] = useState(null); // Cache profile image locally
  
  // Story viewer states
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentViewingStories, setCurrentViewingStories] = useState([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [allUsersWithStories, setAllUsersWithStories] = useState([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [userClickCount, setUserClickCount] = useState({}); // Track clicks per user
  const [clickTimeouts, setClickTimeouts] = useState({}); // Track timeouts for resetting clicks
  const [isLatestStoryFirst, setIsLatestStoryFirst] = useState(false); // Track if latest story is shown first
  
  const user = GetTokenFromCookie();
  
  // GraphQL hooks
  const { data: usersData, refetch: refetchUsers } = useQuery(GET_ALL_USERS, { 
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-first' // Use cache first, then network
  });
  const { data: meData, refetch: refetchMe } = useQuery(GET_ME, { 
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-first' // Use cache first, then network
  });
  const [addStory] = useMutation(ADD_STORY);
  const [uploadStoryMedia] = useMutation(UPLOAD_STORY_MEDIA);
  const [deleteStory] = useMutation(DELETE_STORY);

  // Original states
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [activeTool, setActiveTool] = useState(null);
  const [textColor, setTextColor] = useState('#ffffff'); // default white
  const [textSize, setTextSize] = useState(24); // default 24px, now number
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }); // percent of modal
  const [textValue, setTextValue] = useState(""); // Add this line

  // Add new state for text modal features
  const [isEditing, setIsEditing] = useState(false);
  const [textAlign, setTextAlign] = useState('center');
  const [isBold, setIsBold] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false);
  const [textFont, setTextFont] = useState('Arial'); // Add font family state

  // Sticker/Emoji state
  const [stickers, setStickers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const stickerRefs = useRef({});

  // GIF state
  const [gifs, setGifs] = useState([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const gifRefs = useRef({});

  // Font options
  const fontOptions = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times', value: 'Times New Roman, serif' },
    { name: 'Courier', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Comic', value: 'Comic Sans MS, cursive' },
    { name: 'Impact', value: 'Impact, fantasy' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  ];

  // Modern drag state management
  const [showDragHint, setShowDragHint] = useState(false);

  // Show drag hint when text is created
  useEffect(() => {
    if (textValue && !isEditing) {
      setShowDragHint(true);
      const timer = setTimeout(() => setShowDragHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [textValue, isEditing]);

  // Monitor userStories changes for real-time updates
  useEffect(() => {
    // Force re-render when userStories change to ensure proper sorting
    console.log('📊 UserStories updated, triggering re-render for proper sorting');
    
    // Log current story order for debugging
    const sortedUsers = Object.values(userStories)
      .filter(({ user: userData }) => userData?.id !== user?.id)
      .sort((a, b) => {
        const aTime = a.lastStoryTime || (a.stories[0] ? new Date(a.stories[0].createdAt).getTime() : 0);
        const bTime = b.lastStoryTime || (b.stories[0] ? new Date(b.stories[0].createdAt).getTime() : 0);
        return bTime - aTime;
      });
    
    console.log('📋 Current story order:', sortedUsers.map(s => ({
      name: s.user.name,
      lastStoryTime: s.lastStoryTime ? new Date(s.lastStoryTime).toLocaleTimeString() : 'N/A',
      storiesCount: s.stories.length
    })));
  }, [userStories, user?.id]);

  // Monitor profile image changes for real-time updates
  useEffect(() => {
    console.log('🖼️ Profile data updated, forcing re-render for latest profile images');
    setProfileUpdateTrigger(prev => prev + 1); // Trigger re-render
    
    // Update cached user data in userStories when profile images change
    if (meData?.getMe || usersData?.users) {
      updateCachedUserData(meData?.getMe, usersData?.users);
    }
  }, [meData?.getMe?.profileImage, usersData?.users, meData?.getMe, usersData]);

  // Load cached profile image on component mount
  useEffect(() => {
    const savedProfileImage = localStorage.getItem(`profileImage_${user?.id}`);
    if (savedProfileImage) {
      setCachedProfileImage(savedProfileImage);
      console.log('📱 Loaded cached profile image from localStorage');
    }
  }, [user?.id]);

  // Force component re-render when meData changes and save to localStorage
  useEffect(() => {
    if (meData?.getMe?.profileImage && meData.getMe.profileImage !== cachedProfileImage) {
      console.log('🔄 New profile image detected:', meData.getMe.profileImage);
      setCachedProfileImage(meData.getMe.profileImage);
      localStorage.setItem(`profileImage_${user?.id}`, meData.getMe.profileImage);
      setProfileUpdateTrigger(prev => prev + 1);
    }
  }, [meData?.getMe?.profileImage, user?.id, cachedProfileImage]);

  // Disabled auto-refresh to prevent profile image flickering
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     console.log('🔄 Auto-refreshing profile data to keep images updated');
  //     try {
  //       await refetchMe();
  //       await refetchUsers();
  //     } catch (error) {
  //       console.error('❌ Error in auto-refresh:', error);
  //     }
  //   }, 5000); // Refresh every 5 seconds for faster updates

  //   return () => clearInterval(interval);
  // }, [refetchMe, refetchUsers]);

  // Delete text
  const handleDeleteText = (id) => {
    // This function is no longer needed as there's only one text input
  };

  // Story viewer handlers
  const handleStoryClick = (userId) => {
    const userStoryData = userStories[userId];
    if (userStoryData && userStoryData.stories.length > 0) {
      // Clear existing timeout for this user
      if (clickTimeouts[userId]) {
        clearTimeout(clickTimeouts[userId]);
      }
      
      // Track click count for this user
      const currentClickCount = userClickCount[userId] || 0;
      const newClickCount = currentClickCount + 1;
      
      setUserClickCount(prev => ({
        ...prev,
        [userId]: newClickCount
      }));
      
      // Set timeout to reset click count after 10 seconds of inactivity
      const timeoutId = setTimeout(() => {
        setUserClickCount(prev => ({
          ...prev,
          [userId]: 0
        }));
        setClickTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[userId];
          return newTimeouts;
        });
        console.log(`🔄 Reset click count for user ${userStoryData.user.name}`);
      }, 10000); // 10 seconds
      
      setClickTimeouts(prev => ({
        ...prev,
        [userId]: timeoutId
      }));
      
      // Determine which story to show based on click count
      let storyIndexToShow = 0;
      let isShowingLatestFirst = false;
      
      if (userStoryData.stories.length > 1) {
        if (newClickCount === 1) {
          // First click: show latest story (last index)
          storyIndexToShow = userStoryData.stories.length - 1;
          isShowingLatestFirst = true;
        } else {
          // Second click onwards: show oldest first (index 0, 1, 2...)
          storyIndexToShow = Math.min(newClickCount - 2, userStoryData.stories.length - 1);
        }
      }
      
      setIsLatestStoryFirst(isShowingLatestFirst);
      
      console.log(`👆 User ${userStoryData.user.name} clicked ${newClickCount} times, showing story index ${storyIndexToShow}`);
      
      // Always show ONLY the clicked user's stories in the viewer
      const clickedIsCurrentUser = user && userId === user.id;
      const clickedUserData = clickedIsCurrentUser
        ? (meData?.getMe || user)
        : (usersData?.users?.find(u => u.id === userId) || (userStories[userId]?.user));

      const usersWithStories = [{
        userId,
        userData: clickedUserData,
        stories: userStories[userId].stories
      }];
      
      // Find the index of clicked user
      const clickedUserIndex = usersWithStories.findIndex(u => u.userId === userId);
      
      setAllUsersWithStories(usersWithStories);
      setCurrentUserIndex(clickedUserIndex);
      setCurrentViewingStories(userStoryData.stories);
      setCurrentStoryIndex(storyIndexToShow); // Set the story index based on click count
      setShowStoryViewer(true);
    }
  };

  const handleCloseStoryViewer = () => {
    setShowStoryViewer(false);
    setCurrentViewingStories([]);
    setCurrentStoryIndex(0);
    setAllUsersWithStories([]);
    setCurrentUserIndex(0);
  };

  // Handle when a story is seen
  const handleStorySeen = (story, storyIndex) => {
    const currentUser = allUsersWithStories[currentUserIndex];
    if (currentUser && currentUser.userId === user?.id) {
      // If it's own story and it was the latest story (last index), mark as seen
      if (storyIndex === currentViewingStories.length - 1) {
        console.log('🔄 Latest story seen, next click will start from oldest');
        // Set a flag or modify click count logic
        setUserClickCount(prev => ({
          ...prev,
          [user.id]: 1 // Set to 1 so next click shows oldest story
        }));
      }
    }
  };

  // Function to update cached user data in stories
  const updateCachedUserData = (updatedMeData, updatedUsersData) => {
    setUserStories(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      // Update current user's cached data
      if (updatedMeData && updated[updatedMeData.id]) {
        updated[updatedMeData.id] = {
          ...updated[updatedMeData.id],
          user: updatedMeData
        };
        hasChanges = true;
        console.log('🔄 Updated cached data for current user:', updatedMeData.name);
      }
      
      // Update other users' cached data
      if (updatedUsersData) {
        updatedUsersData.forEach(userData => {
          if (updated[userData.id]) {
            updated[userData.id] = {
              ...updated[userData.id],
              user: userData
            };
            hasChanges = true;
            console.log('🔄 Updated cached data for user:', userData.name);
          }
        });
      }
      
      return hasChanges ? updated : prev;
    });
  };

  // Manual refresh function for profile updates and stories
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered for profile updates and stories');
    try {
      // Refetch user data and stories
      const [meResult, usersResult] = await Promise.all([
        refetchMe(),
        refetchUsers()
      ]);
      
      // Immediately fetch stories after getting fresh user data
      if (meResult?.data?.getMe && usersResult?.data?.users) {
        const currentUser = meResult.data.getMe;
        const followingIds = currentUser.following?.map(f => f.id) || [];
        const followedUsers = usersResult.data.users.filter(u => followingIds.includes(u.id));
        const usersToFetch = [currentUser, ...followedUsers];
        
        // Fetch stories for followed users and all users
        fetchAllUserStories(usersToFetch, true);
        fetchAllUserStories(usersResult.data.users.slice(0, 20), true);
      }
      
      console.log('✅ Profile data and stories refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing profile data and stories:', error);
    }
  };

  // Handle story deletion
  const handleDeleteStory = async (storyId, storyIndex) => {
    try {
      console.log('🗑️ Deleting story:', storyId);
      
      // Call delete mutation
      const result = await deleteStory({
        variables: {
          userId: user.id,
          statusId: storyId
        }
      });

      if (result.data?.deleteStory) {
        console.log('✅ Story deleted successfully');
        
        // Remove story from local state
        setUserStories(prev => {
          const updatedStories = { ...prev };
          if (updatedStories[user.id]) {
            updatedStories[user.id].stories = updatedStories[user.id].stories.filter(
              story => story.id !== storyId
            );
            
            // If no stories left, remove user from stories
            if (updatedStories[user.id].stories.length === 0) {
              delete updatedStories[user.id];
            }
          }
          return updatedStories;
        });

        // Update current viewing stories
        const updatedViewingStories = currentViewingStories.filter(story => story.id !== storyId);
        setCurrentViewingStories(updatedViewingStories);

        // If no stories left, close viewer
        if (updatedViewingStories.length === 0) {
          handleCloseStoryViewer();
        } else {
          // Adjust current index if needed
          if (storyIndex <= currentStoryIndex && currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
          }
        }

        // Refresh stories to get updated data
        if (meData?.getMe && usersData?.users) {
          const currentUser = meData.getMe;
          const followingIds = currentUser.following?.map(f => f.id) || [];
          const followedUsers = usersData.users.filter(u => followingIds.includes(u.id));
          const usersToFetch = [currentUser, ...followedUsers];
          
          setTimeout(() => {
            fetchAllUserStories(usersToFetch, true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting story:', error);
      alert('Failed to delete story. Please try again.');
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(clickTimeouts).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
  }, [clickTimeouts]);

  // Disabled window focus refresh to prevent constant refreshing
  // useEffect(() => {
  //   const handleWindowFocus = async () => {
  //     console.log('🔄 Window focused, refreshing user data for profile updates');
  //     try {
  //       // Force refetch of user data to get latest profile images
  //       await refetchMe();
  //       await refetchUsers();
  //       console.log('✅ Profile data refreshed on window focus');
  //     } catch (error) {
  //       console.error('❌ Error refreshing data on window focus:', error);
  //     }
  //   };

  //   const handleVisibilityChange = () => {
  //     if (!document.hidden) {
  //       console.log('🔄 Page became visible, refreshing user data for profile updates');
  //       handleWindowFocus();
  //     }
  //   };

  //   // Also listen for storage events (when profile is updated in another tab)
  //   const handleStorageChange = (e) => {
  //     if (e.key === 'profileUpdated') {
  //       console.log('🔄 Profile updated in another tab, refreshing data');
  //       handleWindowFocus();
  //     }
  //   };

  //   window.addEventListener('focus', handleWindowFocus);
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   window.addEventListener('storage', handleStorageChange);
    
  //   return () => {
  //     window.removeEventListener('focus', handleWindowFocus);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     window.removeEventListener('storage', handleStorageChange);
  //   };
  // }, [refetchMe, refetchUsers]);

  // Handle own story click with different logic
  const handleMyOwnStoryClick = () => {
    if (!user || !userStories[user.id] || !userStories[user.id].stories.length) return;
    
    const myStories = userStories[user.id].stories;
    
    // Clear existing timeout for current user
    if (clickTimeouts[user.id]) {
      clearTimeout(clickTimeouts[user.id]);
    }
    
    // Track click count for own stories
    const currentClickCount = userClickCount[user.id] || 0;
    const newClickCount = currentClickCount + 1;
    
    setUserClickCount(prev => ({
      ...prev,
      [user.id]: newClickCount
    }));
    
    // Set timeout to reset click count after 10 seconds of inactivity
    const timeoutId = setTimeout(() => {
      setUserClickCount(prev => ({
        ...prev,
        [user.id]: 0
      }));
      setClickTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[user.id];
        return newTimeouts;
      });
      console.log(`🔄 Reset click count for own stories`);
    }, 10000); // 10 seconds
    
    setClickTimeouts(prev => ({
      ...prev,
      [user.id]: timeoutId
    }));
    
    // Determine which story to show based on click count
    let storyIndexToShow = 0;
    let isShowingLatestFirst = false;
    
    if (myStories.length > 1) {
      if (newClickCount === 1) {
        // First click: show latest story (last index)
        storyIndexToShow = myStories.length - 1;
        isShowingLatestFirst = true;
      } else if (newClickCount > myStories.length) {
        // Reset to first story after seeing all
        storyIndexToShow = 0;
        setUserClickCount(prev => ({
          ...prev,
          [user.id]: 1 // Reset count to 1
        }));
      } else {
        // Second click onwards: show oldest first (index 0, 1, 2...)
        storyIndexToShow = newClickCount - 2; // -2 because first click was latest
      }
    }
    
    setIsLatestStoryFirst(isShowingLatestFirst);
    
    console.log(`👆 Own story clicked ${newClickCount} times, showing story index ${storyIndexToShow}`);
    
    // Only include current user's stories in the viewer
    const latestCurrentUserData = meData?.getMe || user;
    const usersWithStories = [{
      userId: user.id,
      userData: latestCurrentUserData,
      stories: myStories
    }];
    
    setAllUsersWithStories(usersWithStories);
    setCurrentUserIndex(0); // Always start with current user
    setCurrentViewingStories(myStories);
    setCurrentStoryIndex(storyIndexToShow);
    setShowStoryViewer(true);
  };

  const handleNextStory = () => {
    // Move to next user's stories
    if (currentUserIndex < allUsersWithStories.length - 1) {
      const nextUserIndex = currentUserIndex + 1;
      const nextUser = allUsersWithStories[nextUserIndex];
      
      setCurrentUserIndex(nextUserIndex);
      setCurrentViewingStories(nextUser.stories);
      setCurrentStoryIndex(0);
    } else {
      handleCloseStoryViewer();
    }
  };

  const handlePreviousStory = () => {
    // Move to previous user's stories
    if (currentUserIndex > 0) {
      const prevUserIndex = currentUserIndex - 1;
      const prevUser = allUsersWithStories[prevUserIndex];
      
      setCurrentUserIndex(prevUserIndex);
      setCurrentViewingStories(prevUser.stories);
      setCurrentStoryIndex(0);
    } else {
      handleCloseStoryViewer();
    }
  };

  // Open camera modal
  const handleOpenCamera = async () => {
    setShowModal(false);
    setShowCamera(true);
  };

  // Start camera stream when camera modal opens
  useEffect(() => {
    if (showCamera) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (err) {
          alert("Unable to access camera");
          setShowCamera(false);
        }
      })();
    } else {
      // Stop camera stream when modal closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera]);

  // Capture photo from video
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      // Set canvas size to 9:16 based on video height
      const height = video.videoHeight;
      const width = Math.round(height * 9 / 16);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      // Draw center crop for 9:16
      const sx = (video.videoWidth - width) / 2;
      ctx.drawImage(video, sx, 0, width, height, 0, 0, width, height);
      setCapturedImage(canvas.toDataURL("image/png"));
    }
  };

  // Close camera modal
  const handleCloseCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
  };

  // Use captured image (upload logic here)
  const handleUsePhoto = async () => {
    if (!capturedImage || !user) return;
    
    // Check daily story limit
    if (dailyStoryCount >= 20) {
      alert('Daily story limit reached! You can only upload 20 stories per day.');
      return;
    }
    
    setIsUploading(true);
    try {
      // Convert base64 to file
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'story-image.png', { type: 'image/png' });
      
      // Upload media
      const { data: uploadData } = await uploadStoryMedia({
        variables: { file }
      });
      
      if (uploadData?.uploadStoryMedia) {
        // Get latest user info from meData for updated profile
        const currentUserInfo = meData?.getMe || user;
        
        // Create story
        const storyResult = await addStory({
          variables: {
            userId: currentUserInfo.id,
            username: currentUserInfo.username || currentUserInfo.name,
            avatar: currentUserInfo.profileImage || `https://ui-avatars.com/api/?name=${currentUserInfo.name}&background=random`,
            mediaType: 'image',
            mediaUrl: uploadData.uploadStoryMedia,
            caption: textValue || null,
            location: null
          }
        });

        // Immediately update local state
        if (storyResult.data?.addStory) {
          const newStory = storyResult.data.addStory;
          const currentUserInfo = meData?.getMe || user;
          
          setUserStories(prev => ({
            ...prev,
            [currentUserInfo.id]: {
              user: { ...currentUserInfo, id: currentUserInfo.id },
              stories: prev[currentUserInfo.id] ? 
                [...prev[currentUserInfo.id].stories, newStory].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : 
                [newStory],
              lastStoryTime: new Date(newStory.createdAt).getTime() // Add timestamp for proper sorting
            }
          }));
          
          // Update daily story count immediately
          setDailyStoryCount(prev => prev + 1);
          
          // Reset click count so new story shows first on next click
          setUserClickCount(prev => ({
            ...prev,
            [user.id]: 0
          }));
          
          console.log('✅ Story added to local state immediately with timestamp and click count reset');
        }
        
        // Refresh stories immediately after upload to get latest ordering
        if (meData?.getMe && usersData?.users) {
          const currentUser = meData.getMe;
          const followingIds = currentUser.following?.map(f => f.id) || [];
          const followedUsers = usersData.users.filter(u => followingIds.includes(u.id));
          const usersToFetch = [currentUser, ...followedUsers];
          console.log('🚀 Refreshing all stories after upload for latest ordering:', usersToFetch.map(u => u.name));
          
          // Force immediate refresh to ensure proper ordering
          setTimeout(() => {
            fetchAllUserStories(usersToFetch, true);
          }, 1000); // Small delay to ensure backend has processed the story
        }
        
        // Close camera and reset states
        setShowCamera(false);
        setCapturedImage(null);
        setTextValue('');
        
        alert('Story uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      
      // Check if it's a daily limit error
      if (error.message && error.message.includes('Daily story limit reached')) {
        alert('Daily story limit reached! You can only upload 20 stories per day.');
      } else {
        alert('Failed to upload story. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setShowCamera(false);
      setCapturedImage(null);
      setTextValue('');
    }
  };

  const handleMyStoryClick = () => {
    // Check daily story limit before opening modal
    if (dailyStoryCount >= 20) {
      alert('Daily story limit reached! You can only upload 20 stories per day.');
      return;
    }
    
    // Show warning when approaching limit
    if (dailyStoryCount >= 18) {
      const remaining = 20 - dailyStoryCount;
      if (!window.confirm(`You have ${remaining} story uploads remaining today. Continue?`)) {
        return;
      }
    }
    
    if (isMobile()) {
      handleOpenCamera();
    } else {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => setShowModal(false);

  const handleChooseGallery = () => {
    fileInputRef.current.click();
    setShowModal(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    // Check daily story limit
    if (dailyStoryCount >= 20) {
      alert('Daily story limit reached! You can only upload 20 stories per day.');
      return;
    }
    
    setIsUploading(true);
    try {
      // Upload media
      const { data: uploadData } = await uploadStoryMedia({
        variables: { file }
      });
      
      if (uploadData?.uploadStoryMedia) {
        // Determine media type
        const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        
        // Get latest user info from meData for updated profile
        const currentUserInfo = meData?.getMe || user;
        
        // Create story
        const storyResult = await addStory({
          variables: {
            userId: currentUserInfo.id,
            username: currentUserInfo.username || currentUserInfo.name,
            avatar: currentUserInfo.profileImage || `https://ui-avatars.com/api/?name=${currentUserInfo.name}&background=random`,
            mediaType,
            mediaUrl: uploadData.uploadStoryMedia,
            caption: null,
            location: null
          }
        });

        // Immediately update local state
        if (storyResult.data?.addStory) {
          const newStory = storyResult.data.addStory;
          const currentUserInfo = meData?.getMe || user;
          
          setUserStories(prev => ({
            ...prev,
            [currentUserInfo.id]: {
              user: { ...currentUserInfo, id: currentUserInfo.id },
              stories: prev[currentUserInfo.id] ? 
                [...prev[currentUserInfo.id].stories, newStory].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : 
                [newStory],
              lastStoryTime: new Date(newStory.createdAt).getTime() // Add timestamp for proper sorting
            }
          }));
          
          // Update daily story count immediately
          setDailyStoryCount(prev => prev + 1);
          
          // Reset click count so new story shows first on next click
          setUserClickCount(prev => ({
            ...prev,
            [user.id]: 0
          }));
          
          console.log('✅ Story added to local state immediately (file upload) with timestamp and click count reset');
        }
        
        // Refresh stories immediately after upload to get latest ordering
        if (meData?.getMe && usersData?.users) {
          const currentUser = meData.getMe;
          const followingIds = currentUser.following?.map(f => f.id) || [];
          const followedUsers = usersData.users.filter(u => followingIds.includes(u.id));
          const usersToFetch = [currentUser, ...followedUsers];
          console.log('🚀 Refreshing all stories after file upload for latest ordering:', usersToFetch.map(u => u.name));
          
          // Force immediate refresh to ensure proper ordering
          setTimeout(() => {
            fetchAllUserStories(usersToFetch, true);
          }, 1000); // Small delay to ensure backend has processed the story
        }
        
        // Close camera and reset states
        setShowCamera(false);
        setCapturedImage(null);
        setTextValue('');
        
        alert('Story uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      
      // Check if it's a daily limit error
      if (error.message && error.message.includes('Daily story limit reached')) {
        alert('Daily story limit reached! You can only upload 20 stories per day.');
      } else {
        alert('Failed to upload story. Please try again.');
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (showCamera || showModal) {
      document.body.classList.add('camera-open');
      const footer = document.querySelector('.footer-nav');
      if (footer) footer.style.display = 'none';
    } else {
      document.body.classList.remove('camera-open');
      const footer = document.querySelector('.footer-nav');
      if (footer) footer.style.display = '';
    }
    return () => {
      document.body.classList.remove('camera-open');
      const footer = document.querySelector('.footer-nav');
      if (footer) footer.style.display = '';
    };
  }, [showCamera, showModal]);

  // Backend integration functions
  useEffect(() => {
    if (usersData?.users) {
      setAllUsers(usersData.users);
      console.log('📋 Users data loaded, triggering immediate story fetch');
    }
  }, [usersData]);

  // Fetch stories for followed users + current user
  useEffect(() => {
    if (meData?.getMe && usersData?.users) {
      const currentUser = meData.getMe;
      const followingIds = currentUser.following?.map(f => f.id) || [];
      
      console.log('🔍 Current user:', currentUser.name);
      console.log('👥 Following IDs:', followingIds);
      console.log('📋 All users count:', usersData.users.length);
      
      // Get followed users from all users list
      const followedUsers = usersData.users.filter(u => followingIds.includes(u.id));
      
      console.log('✅ Followed users found:', followedUsers.map(u => ({ id: u.id, name: u.name })));
      
      // Include current user + followed users
      const usersToFetch = [currentUser, ...followedUsers];
      console.log('📊 Users to fetch stories for:', usersToFetch.map(u => u.name));
      
      // Initial fetch for followed users
      fetchAllUserStories(usersToFetch, true);
      
      // Also fetch all users to show their stories immediately (not just followed ones)
      console.log('🔄 Fetching all users stories to display immediately');
      fetchAllUserStories(usersData.users.slice(0, 20), true); // Fetch all users stories immediately
    }
  }, [meData, usersData]);

  // Periodic refresh to check for new stories and expired stories - DISABLED to prevent profile image override
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (meData?.getMe && usersData?.users) {
  //       console.log('🔄 Periodic refresh of all users stories for real-time updates');
  //       // Update cached user data first
  //       updateCachedUserData(meData.getMe, usersData.users);
  //       // Then fetch stories
  //       fetchAllUserStories(usersData.users.slice(0, 20), true); // Fetch all users stories
  //     }
  //   }, 1 * 60 * 1000); // Refresh every 1 minute for better real-time experience

  //   return () => clearInterval(interval);
  // }, [meData, usersData]);

  // Check backend server health
  const checkServerHealth = async () => {
    try {
      const response = await axios.post("http://localhost:5000/graphql", {
        query: `query { __typename }`
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('❌ Backend server health check failed:', error.message);
      return false;
    }
  };

  // Calculate daily story count for current user
  const calculateDailyStoryCount = () => {
    if (!user?.id || !userStories[user.id]) return 0;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayStories = userStories[user.id].stories?.filter(story => {
      try {
        const storyDate = new Date(story.createdAt);
        return storyDate >= startOfDay;
      } catch {
        return false;
      }
    }) || [];
    
    return todayStories.length;
  };

  // Update daily story count when userStories changes
  useEffect(() => {
    const count = calculateDailyStoryCount();
    setDailyStoryCount(count);
    console.log(`📊 Current user has ${count} stories today`);
  }, [userStories, user?.id]);

  const fetchAllUserStories = async (users, forceRefresh = false) => {
    // Prevent too frequent requests (minimum 15 seconds between fetches for better real-time updates)
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime) < 15000) {
      console.log('⏭️ Skipping fetch - too soon since last request');
      return;
    }

    console.log('🚀 Starting to fetch stories for users:', users.map(u => u.name));
    setIsLoadingStories(true);
    setLastFetchTime(now);
    
    try {
      // Check server health first
      const isServerHealthy = await checkServerHealth();
      if (!isServerHealthy) {
        console.error('💥 Backend server is not responding. Skipping story fetch.');
        return;
      }
      
      const storiesMap = {};
    
    for (const userData of users) {
      // Skip if userData is invalid
      if (!userData || !userData.id) {
        continue;
      }

      // Retry logic for each user
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const query = `
            query GetUserStories($userId: ID!) {
              getUserStories(userId: $userId) {
                id
                userId
                username
                avatar
                mediaType
                mediaUrl
                caption
                createdAt
                expiresAt
                location
                viewers
              }
            }
          `;
          
          console.log(`📡 Fetching stories for ${userData.name} (ID: ${userData.id}) (attempt ${retryCount + 1}/${maxRetries})`);
          
          const response = await axios.post("http://localhost:5000/graphql", {
            query,
            variables: { userId: userData.id }
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000 // 15 second timeout
          });

          console.log(`📡 Raw response for ${userData.name}:`, response.data);

          // Check for GraphQL errors
          if (response.data?.errors) {
            console.error(`GraphQL errors for ${userData.name}:`, response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
          }

          console.log(`📊 Response for ${userData.name}:`, response.data?.data?.getUserStories?.length || 0, 'stories');
          
          if (response.data?.data?.getUserStories) {
            const stories = response.data.data.getUserStories;
            // Filter out expired stories
            const activeStories = stories.filter(story => {
              if (!story.expiresAt) return true; // If no expiry date, consider it active
              try {
                const expiresAt = new Date(story.expiresAt);
                const isActive = expiresAt > new Date();
                if (!isActive) {
                  console.log(`⏰ Story ${story.id} expired for ${userData.name}`);
                }
                return isActive;
              } catch (error) {
                console.warn('Invalid expiresAt date for story:', story.id);
                return true; // If date is invalid, consider it active
              }
            });
            
            if (activeStories.length > 0) {
              console.log(`✅ Found ${activeStories.length} active stories for ${userData.name}`);
              // Sort stories by createdAt (oldest first for viewing sequence)
              const sortedStories = activeStories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              // But keep track of latest story time for user ordering
              const latestStoryTime = Math.max(...activeStories.map(s => new Date(s.createdAt).getTime()));
              
              // Use the latest user data from GraphQL queries instead of passed userData
              let latestUserData = userData;
              if (userData.id === user?.id && meData?.getMe) {
                latestUserData = meData.getMe;
              } else if (usersData?.users) {
                const foundUser = usersData.users.find(u => u.id === userData.id);
                if (foundUser) {
                  latestUserData = foundUser;
                }
              }
              
              storiesMap[userData.id] = {
                user: latestUserData, // Use latest user data instead of cached userData
                stories: sortedStories,
                lastStoryTime: latestStoryTime // Use latest story time for user ordering
              };
            } else {
              console.log(`❌ No active stories found for ${userData.name}`);
            }
            
            success = true; // Mark as successful
          } else {
            console.log(`⚠️ No data received for ${userData.name}`);
            success = true; // Don't retry if no data (user might not have stories)
          }

        } catch (error) {
          retryCount++;
          console.error(`❌ Error fetching stories for ${userData.name} (attempt ${retryCount}):`, error.message);
          
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in ${retryCount * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Exponential backoff
          } else {
            console.error(`💥 Failed to fetch stories for ${userData.name} after ${maxRetries} attempts`);
          }
        }
      }
    }
    
      console.log('📊 Final stories map:', Object.keys(storiesMap).length, 'users with stories');
      console.log('👥 Users with stories:', Object.values(storiesMap).map(s => s.user.name));
      
      // Update state with proper sorting by latest story time
      setUserStories(prev => {
        const updatedStories = { ...prev, ...storiesMap };
        console.log('🔄 Updated stories with latest data, total users:', Object.keys(updatedStories).length);
        
        // Debug: Show which users have stories
        Object.values(updatedStories).forEach(({ user, stories }) => {
          console.log(`👤 ${user.name}: ${stories.length} stories`);
        });
        
        return updatedStories;
      });
    } catch (error) {
      console.error('💥 Error in fetchAllUserStories:', error);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  // When text tool is activated, open edit mode
  useEffect(() => {
    if (activeTool === 'text') setIsEditing(true);
    else setIsEditing(false);
  }, [activeTool]);

  // Handler for Done button
  const handleDoneEdit = () => {
    setIsEditing(false);
    setActiveTool(null);
    // Sync dragPosition to modal input's position (convert % to px)
    const xPx = (textPosition.x / 100) * window.innerWidth;
    const yPx = (textPosition.y / 100) * window.innerHeight;
    // setDragPosition({ x: xPx, y: yPx }); // This line is removed
  };

  // 1. Add drag state and refs
  const [isDraggingText, setIsDraggingText] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 50, y: 50 }); // percent
  const modalRef = useRef(null);

  // 2. Drag handlers
  const handleTextDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingText(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY };
    dragStartPos.current = { ...textPosition };
    document.addEventListener('mousemove', handleTextDragMove);
    document.addEventListener('mouseup', handleTextDragEnd);
    document.addEventListener('touchmove', handleTextDragMove, { passive: false });
    document.addEventListener('touchend', handleTextDragEnd);
  };

  const handleTextDragMove = (e) => {
    if (!isDraggingText) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const modalRect = modalRef.current.getBoundingClientRect();
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    // Convert to percent of modal
    const newX = dragStartPos.current.x + (dx / modalRect.width) * 100;
    const newY = dragStartPos.current.y + (dy / modalRect.height) * 100;
    // Clamp to 0-100 (with margin)
    const marginX = 5, marginY = 5;
    setTextPosition({
      x: Math.max(marginX, Math.min(100 - marginX, newX)),
      y: Math.max(marginY, Math.min(100 - marginY, newY)),
    });
  };

  const handleTextDragEnd = () => {
    setIsDraggingText(false);
    document.removeEventListener('mousemove', handleTextDragMove);
    document.removeEventListener('mouseup', handleTextDragEnd);
    document.removeEventListener('touchmove', handleTextDragMove);
    document.removeEventListener('touchend', handleTextDragEnd);
  };

  // 3. Cleanup on unmount
  useEffect(() => () => handleTextDragEnd(), []);

  // 4. In the modal, add ref={modalRef} to the 9:16 area
  // 5. Render the text box (input or display) absolutely inside the modal, using left/top percent, and attach drag handlers

  // Simplified drag handlers
  // const handleDragStart = (e) => { // This function is removed
  //   console.log('Drag Start');
  //   e.preventDefault();
  //   e.stopPropagation();
    
  //   setIsDraggingText(true);
  //   setDragging(true);
    
  //   const startX = e.clientX || (e.touches && e.touches[0]?.clientX);
  //   const startY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
  //   dragOffset.current = {
  //     x: startX - dragPosition.x,
  //     y: startY - dragPosition.y
  //   };
    
  //   document.addEventListener('mousemove', handleDragMove);
  //   document.addEventListener('mouseup', handleDragEnd);
  //   document.addEventListener('touchmove', handleDragMove, { passive: false });
  //   document.addEventListener('touchend', handleDragEnd);
  // };

  // const handleDragMove = (e) => { // This function is removed
  //   if (!isDraggingText) return;
  //   console.log('Drag Move');
  //   e.preventDefault();
  //   e.stopPropagation();
    
  //   const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
  //   const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
  //   if (!clientX || !clientY) return;
    
  //   const newX = clientX - dragOffset.current.x;
  //   const newY = clientY - dragOffset.current.y;
    
  //   // Keep within viewport bounds
  //   const maxX = window.innerWidth - 100;
  //   const maxY = window.innerHeight - 50;
    
  //   const boundedX = Math.max(0, Math.min(maxX, newX));
  //   const boundedY = Math.max(0, Math.min(maxY, newY));
    
  //   setDragPosition({ x: boundedX, y: boundedY });
  // };

  // const handleDragEnd = (e) => { // This function is removed
  //   console.log('Drag End');
  //   setIsDraggingText(false);
  //   setDragging(false);
    
  //   document.removeEventListener('mousemove', handleDragMove);
  //   document.removeEventListener('mouseup', handleDragEnd);
  //   document.removeEventListener('touchmove', handleDragMove);
  //   document.removeEventListener('touchend', handleDragEnd);
  // };

  const handleTextClick = (e) => {
    if (!isEditing) {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(true);
      setActiveTool('text');
    }
  };

  // Add a small delay to distinguish between click and drag
  // const [dragStartTime, setDragStartTime] = useState(0); // This state is removed
  // const [isDragging, setIsDragging] = useState(false); // This state is removed

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      // document.removeEventListener('mousemove', handleDragMove); // This line is removed
      // document.removeEventListener('mouseup', handleDragEnd); // This line is removed
      // document.removeEventListener('touchmove', handleDragMove); // This line is removed
      // document.removeEventListener('touchend', handleDragEnd); // This line is removed
    };
  }, []);

  // Add state for moveable text box
  const [textBox, setTextBox] = useState({
    left: 60, // center of modal width (320px - 200px width) / 2
    top: 254, // center of modal height (568px - 60px height) / 2
    width: 200, // px
    height: 60, // px
    rotation: 0, // deg
    value: '',
    isEditing: true,
  });
  const textBoxRef = useRef();
  const [showMoveable, setShowMoveable] = useState(false);

  // Helper to update textBox state
  const updateTextBox = (patch) => setTextBox((prev) => ({ ...prev, ...patch }));

  // When 'Text' tool is activated, show the moveable box
  useEffect(() => {
    if (activeTool === 'text') {
      setShowMoveable(true);
      updateTextBox({ isEditing: true }); // Open full text edit modal immediately
    } else {
      setShowMoveable(false);
    }
  }, [activeTool]);

  // Allow editing anytime (double click/tap)
  const handleTextBoxDoubleClick = () => updateTextBox({ isEditing: true });

  // Handle blur (exit edit mode)
  const handleTextBoxBlur = () => {
    // Only exit edit mode, don't reset activeTool
    updateTextBox({ isEditing: false });
  };

  // Handle Done button click
  const handleDoneClick = () => {
    updateTextBox({ isEditing: false });
    setActiveTool(null); // Return to main story modal and show buttons
  };

  // Auto-resize textarea function
  const handleTextareaChange = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    
    // Update textBox height based on content
    const newHeight = Math.max(40, textarea.scrollHeight);
    updateTextBox({ 
      value: e.target.value,
      height: newHeight
    });
  };

  // Emoji picker handler
  const handleEmojiClick = (emojiObject) => {
    const newSticker = {
      id: Date.now(),
      emoji: emojiObject.emoji,
      left: 100,
      top: 200,
      size: 40,
      rotation: 0,
    };
    setStickers([...stickers, newSticker]);
    setShowEmojiPicker(false);
    setActiveTool(null);
  };

  // Delete sticker function
  const deleteSticker = (stickerId) => {
    setStickers(prev => prev.filter(sticker => sticker.id !== stickerId));
  };

  // Sticker drag handlers (same as text drag logic)
  const handleStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    const startLeft = sticker.left;
    const startTop = sticker.top;

    const handleMouseMove = (e) => {
      const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      const newLeft = Math.max(0, Math.min(320 - sticker.size, startLeft + deltaX));
      const newTop = Math.max(0, Math.min(568 - sticker.size, startTop + deltaY));
      
      setStickers(prev => 
        prev.map(s => 
          s.id === stickerId 
            ? { ...s, left: newLeft, top: newTop }
            : s
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
    }
  };

  // Replace GIF picker logic
  const handleGifSelect = (gif) => {
    const newGif = {
      id: Date.now(),
      url: gif.url,
      left: 100,
      top: 200,
      width: 200, // Default width
      height: 150, // Default height - rectangular
      rotation: 0,
    };
    setGifs([...gifs, newGif]);
    setShowGifPicker(false);
    setActiveTool(null);
  };

  // Delete GIF function
  const deleteGif = (gifId) => {
    setGifs(prev => prev.filter(gif => gif.id !== gifId));
  };

  // GIF drag handlers (same as sticker drag logic)
  const handleGifDragStart = (e, gifId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const gif = gifs.find(g => g.id === gifId);
    if (!gif) return;

    const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    const startLeft = gif.left;
    const startTop = gif.top;

    const handleMouseMove = (e) => {
      const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      const newLeft = Math.max(0, Math.min(320 - gif.width, startLeft + deltaX));
      const newTop = Math.max(0, Math.min(568 - gif.height, startTop + deltaY));
      
      setGifs(prev => 
        prev.map(g => 
          g.id === gifId 
            ? { ...g, left: newLeft, top: newTop }
            : g
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
    }
  };

  // Add a static array of GIFs
  const staticGifs = [
    {
      id: 'gif1',
      url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      title: 'Funny Cat',
    },
    {
      id: 'gif2',
      url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
      title: 'Cute Dog',
    },
    {
      id: 'gif3',
      url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      title: 'Dancing',
    },
    {
      id: 'gif4',
      url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
      title: 'Excited',
    },
    {
      id: 'gif5',
      url: 'https://media.giphy.com/media/3orieQEA4Gx5U/giphy.gif',
      title: 'Reaction',
    },
    {
      id: 'gif6',
      url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      title: 'Thumbs Up',
    },
  ];

  const TENOR_API_KEY = 'LIVDSRZULELA';

  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [gifResults, setGifResults] = useState(staticGifs);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState('');

  const fetchGifs = async (query) => {
    setGifLoading(true);
    setGifError('');
    setGifResults([]); // Clear grid while loading
    try {
      const url = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=16`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=16`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setGifResults(data.results.map(gif => ({
          id: gif.id,
          url: gif.media_formats.gif.url,
          title: gif.content_description || 'GIF',
        })));
      } else {
        setGifResults([]);
        setGifError('No GIFs found');
      }
    } catch (e) {
      setGifResults(staticGifs);
      setGifError('');
    } finally {
      setGifLoading(false);
    }
  };

  // Load trending GIFs by default when GIF picker opens
  useEffect(() => {
    if (activeTool === 'gif') {
      fetchGifs('');
    }
  }, [activeTool]);

  // Add drawing tool state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const drawingCanvasRef = useRef(null);
  const drawingContextRef = useRef(null);

  // Add undo state and functionality
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Add custom color picker state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#ffffff');

  // Modified drawing tool colors - only 4-5 basic colors
  const drawingColors = [
    { color: '#ffffff', label: 'White' },
    { color: '#000000', label: 'Black' },
    { color: '#ff1744', label: 'Red' },
    { color: '#2979ff', label: 'Blue' },
    { color: '#4caf50', label: 'Green' },
  ];

  // Handle custom color change
  const handleCustomColorChange = (color) => {
    setCustomColor(color);
    handleColorChange(color);
    setShowColorPicker(false);
  };

  // Initialize drawing canvas with undo functionality
  useEffect(() => {
    if (activeTool === 'draw' && drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas size to match the story modal
      canvas.width = 320;
      canvas.height = 568;
      
      // Set initial drawing style
      context.strokeStyle = drawingColor;
      context.lineWidth = brushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      drawingContextRef.current = context;
      
      // Save initial blank state
      saveCanvasState();
    }
  }, [activeTool, drawingColor, brushSize]);

  // Save canvas state for undo
  const saveCanvasState = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL();
    setDrawingHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  // Undo function
  const undoDrawing = () => {
    if (historyIndex > 0) {
      const canvas = drawingCanvasRef.current;
      const context = drawingContextRef.current;
      if (!canvas || !context) return;
      
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      img.src = drawingHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      // Clear to initial state
      const canvas = drawingCanvasRef.current;
      const context = drawingContextRef.current;
      if (!canvas || !context) return;
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      setHistoryIndex(-1);
    }
  };

  // Modified drawing functions to save state
  const startDrawing = (e) => {
    if (activeTool !== 'draw') return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    if (!canvas || !context) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || activeTool !== 'draw') return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    if (!canvas || !context) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  };

  // Modified clear canvas to save state
  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  // Handle color change
  const handleColorChange = (color) => {
    setDrawingColor(color);
    setIsEraser(false);
    if (drawingContextRef.current) {
      drawingContextRef.current.strokeStyle = color;
    }
  };

  // Handle brush size change
  const handleBrushSizeChange = (size) => {
    setBrushSize(size);
    if (drawingContextRef.current) {
      drawingContextRef.current.lineWidth = size;
    }
  };

  // Handle eraser
  const handleEraser = () => {
    setIsEraser(true);
    if (drawingContextRef.current) {
      drawingContextRef.current.strokeStyle = '#000000'; // Black for eraser
      drawingContextRef.current.globalCompositeOperation = 'destination-out';
    }
  };

  // Handle brush
  const handleBrush = () => {
    setIsEraser(false);
    if (drawingContextRef.current) {
      drawingContextRef.current.globalCompositeOperation = 'source-over';
      drawingContextRef.current.strokeStyle = drawingColor;
    }
  };

  return (
    <div className="relative flex items-center px-4 py-3 overflow-hidden">
      <button onClick={() => {}} className="absolute left-0 z-10 bg-white p-2 rounded-full shadow-md cursor-not-allowed opacity-50" disabled>
        <FaChevronLeft />
      </button>
      <div
        ref={storyBarRef}
        className="flex gap-4 overflow-hidden whitespace-nowrap flex-grow mx-6"
        style={{ overflowX: 'hidden', overflowY: 'hidden' }}
      >
        {/* Current User - Add Story */}
        {user && (
          <div className="relative inline-block w-16 h-16 min-w-[64px] min-h-[64px]">
            <div 
              className={`w-full h-full rounded-full border-2 overflow-hidden cursor-pointer ${
                userStories[user?.id] && userStories[user?.id].stories && userStories[user?.id].stories.length > 0 ? 'border-purple-500' : 'border-gray-300'
              }`}
              onClick={() => {
                if (userStories[user?.id] && userStories[user?.id].stories && userStories[user?.id].stories.length > 0) {
                  handleMyOwnStoryClick(); // Use special function for own stories
                }
                //  else {
                //   handleMyStoryClick();
                // }
              }}
            >
              <img
                src={(meData?.getMe?.profileImage || cachedProfileImage) || `https://ui-avatars.com/api/?name=${(meData?.getMe?.name || user?.name)}&background=random`}
                alt="Your story"
                className="w-full h-full object-cover"
                key={`my-profile-${meData?.getMe?.profileImage || cachedProfileImage || 'default'}`}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${(meData?.getMe?.name || user?.name)}&background=random`;
                }}
              />
            </div>
            {/* Always show plus icon */}
            <div
              className="absolute bottom-0 right-0 bg-white rounded-full p-[2px] text-xs shadow-sm cursor-pointer border border-purple-200"
              onClick={(e) => {
                e.stopPropagation();
                handleMyStoryClick();
              }}
            >
              <FaPlus className="text-purple-600 cursor-pointer" />
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
              {userStories[user.id] && userStories[user.id].stories && userStories[user.id].stories.length > 0 ? 'Your story' : 'Add story'}
            </div>
            {/* Daily story count indicator */}
            {dailyStoryCount > 0 && (
              <div className={`absolute -top-2 -right-2 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                dailyStoryCount >= 18 ? 'bg-red-500' : dailyStoryCount >= 15 ? 'bg-orange-500' : 'bg-purple-500'
              }`}>
                {dailyStoryCount}
              </div>
            )}
          </div>
        )}

        {/* Other Users' Stories */}
        {(() => {
          const filteredStories = Object.values(userStories)
            .filter(({ user: userData }) => userData?.id !== user?.id);
          
          console.log('🎯 Rendering stories for users:', filteredStories.map(s => ({ 
            name: s.user.name, 
            storiesCount: s.stories.length,
            hasLastStoryTime: !!s.lastStoryTime 
          })));
          
          return filteredStories
            .sort((a, b) => {
              // Sort users by their latest story timestamp (newest first)
              // Use lastStoryTime if available, otherwise fallback to first story's createdAt
              const aTime = a.lastStoryTime || (a.stories[0] ? new Date(a.stories[0].createdAt).getTime() : 0);
              const bTime = b.lastStoryTime || (b.stories[0] ? new Date(b.stories[0].createdAt).getTime() : 0);
              
              return bTime - aTime; // Newest first (left side)
            })
            .map(({ user: userData, stories }) => {
              // Get the latest user data from usersData instead of cached userData
              const latestUserData = usersData?.users?.find(u => u.id === userData.id) || userData;
              return (
                <div key={userData.id} className="relative inline-block w-16 h-16 min-w-[64px] min-h-[64px]">
                  <div 
                    className="w-full h-full rounded-full border-2 border-purple-500 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleStoryClick(userData.id)}
                  >
                    <img
                      src={latestUserData.profileImage ? `${latestUserData.profileImage}?t=${Date.now()}` : `https://ui-avatars.com/api/?name=${latestUserData.name}&background=random`}
                      alt={`${latestUserData.name}'s story`}
                      className="w-full h-full object-cover"
                      key={`user-${userData.id}-${latestUserData.profileImage || 'default'}-${profileUpdateTrigger}`}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${latestUserData.name}&background=random`;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap max-w-20 truncate">
                    {latestUserData.name}
                  </div>
                </div>
              );
            });
        })()}

        {/* Loading indicator */}
        {/* Show message if no stories and not loading */}
        {!isLoadingStories && Object.keys(userStories).length === 0 && (
          <div className="flex items-center justify-center w-full py-4">
            <p className="text-gray-500 text-sm">No stories available</p>
          </div>
        )}
      </div>
      <div className="absolute right-0 z-10 flex gap-2">
        <button 
          onClick={handleManualRefresh} 
          className="bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
          title="Refresh profile updates"
        >
          <MdRefresh className="text-purple-600" />
        </button>
        <button onClick={() => {}} className="bg-white p-2 rounded-full shadow-md cursor-not-allowed opacity-50" disabled>
          <FaChevronRight />
        </button>
      </div>
      {/* Hidden file input for gallery */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {/* Modal for desktop */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xs mx-4 relative animate-fadeIn">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold text-center mb-6 text-purple-700">Add to Your Story</h2>
            <div className="flex flex-col gap-4">
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
                onClick={handleOpenCamera}
              >
                <span role="img" aria-label="camera">📷</span> Open Camera
              </button>
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-purple-700 rounded-lg shadow hover:bg-gray-200 transition"
                onClick={handleChooseGallery}
              >
                <span role="img" aria-label="gallery">🖼️</span> Choose from Gallery
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Camera Modal (9:16 aspect ratio) */}
      {showCamera && (
        isMobile() ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70">
            <div className="fixed inset-0 w-screen h-screen flex flex-col items-center animate-fadeIn overflow-hidden p-0 bg-transparent z-[9999]" style={{ zIndex: 99999 }}>
              <button
                className="absolute top-0 right-0 w-14 h-14 flex items-center justify-center text-white text-5xl font-extrabold z-30 transition drop-shadow-lg hover:text-purple-400 focus:outline-none"
                onClick={handleCloseCamera}
                aria-label="Close"
              >
                &times;
              </button>
              <div className="flex-1 flex flex-col items-center justify-center w-full h-full relative">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover bg-black shadow-2xl border border-purple-200"
                      style={{ maxHeight: "100%" }}
                    />
                    {/* Choose from Gallery Button (left and slightly lower) */}
                    <button
                      className="absolute bottom-5 mb-2 left-[35%] -translate-x-1/2 w-12 h-12 flex items-center justify-center shadow-md hover:bg-purple-50 active:scale-95 transition group rounded-full bg-transparent border-0"
                      type="button"
                      onClick={handleChooseGallery}
                    >
                      <MdAddPhotoAlternate className="text-white text-2xl transition" />
                    </button>
                    {/* Filter Button (right and slightly lower) */}
                    <button
                      className="absolute bottom-5 mb-2 left-[66%] -translate-x-1/2 w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition group rounded-full bg-transparent"
                      style={isMobile() ? { left: '69%' } : {}}
                      type="button"
                      onClick={() => {/* TODO: filter logic */}}
                    >
                      <TbFiltersFilled className="text-white text-2xl" />
                    </button>
                    {/* Capture Button (center right, higher) */}
                    <button
                      className="absolute bottom-0 mb-6 left-[55%] -translate-x-1/2 w-16 h-16 flex items-center justify-center shadow-md hover:bg-purple-50 active:scale-95 transition group rounded-full bg-transparent border-0"
                      onClick={handleCapture}
                    >
                      <span className="block w-10 h-10 bg-purple-600 group-hover:bg-purple-700 rounded-full transition"></span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative w-full h-full">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover aspect-[9/16] bg-black"
                      />
                      {/* Overlay action buttons below cross button */}
                      <div className="absolute right-1 top-[65px] flex flex-col gap-4 z-30">
                        <button className="w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:bg-purple-100/20 active:scale-95 transition group">
                          <MdTextFields className="text-white text-2xl font-extrabold" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:bg-purple-100/20 active:scale-95 transition group">
                          <MdEmojiEmotions className="text-white text-2xl font-extrabold" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:bg-purple-100/20 active:scale-95 transition group">
                          <MdGif className="text-white text-2xl font-extrabold" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:bg-purple-100/20 active:scale-95 transition group">
                          <MdBrush className="text-white text-2xl font-extrabold" />
                        </button>
                      </div>
                      
                      {/* Bottom action buttons for captured image */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                        <button
                          className="flex-1 max-w-[120px] py-3 px-4 bg-gray-500/80 text-white rounded-lg font-medium hover:bg-gray-600/80 transition-colors"
                          onClick={() => setCapturedImage(null)}
                        >
                          Retake
                        </button>
                        <button
                          className={`flex-1 max-w-[120px] py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 ${
                            isUploading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={handleUsePhoto}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Uploading...
                            </>
                          ) : (
                            'Use Photo'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed left-0 right-0 top-[66px] z-[50] flex items-start justify-center backdrop-blur-sm bg-black/70 p-0">
            <div ref={modalRef} className="relative aspect-[9/16] w-full max-w-[320px] max-h-[calc(100vh-66px)] bg-black/80 shadow-2xl border border-purple-200 animate-fadeIn overflow-hidden p-0">
              <button
                className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center text-white text-4xl font-bold z-30 transition hover:text-purple-600 focus:outline-none bg-transparent"
                onClick={handleCloseCamera}
                aria-label="Close"
              >
                &times;
              </button>
              <div className="flex-1 flex flex-col items-center justify-center w-full h-full relative">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover bg-black shadow-2xl border border-purple-200"
                      style={{ maxHeight: "100%" }}
                    />
                    {/* Choose from Gallery Button (left and slightly lower) */}
                    <button
                      className="absolute bottom-5 mb-2 left-[38%] -translate-x-1/2 w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition group rounded-full bg-transparent"
                      type="button"
                      onClick={handleChooseGallery}
                    >
                      <MdAddPhotoAlternate className="text-white text-2xl transition" />
                    </button>
                    {/* Filter Button (right and slightly lower) */}
                    <button
                      className="absolute bottom-5 mb-2 left-[72%] -translate-x-1/2 w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition group rounded-full bg-transparent"
                      type="button"
                      onClick={() => {/* TODO: filter logic */}}
                    >
                      <TbFiltersFilled className="text-white text-2xl" />
                    </button>
                    {/* Capture Button (center right, higher) */}
                    <button
                      className="absolute bottom-0 mb-6 left-[57%] -translate-x-1/2 w-16 h-16 flex items-center justify-center shadow-lg hover:scale-105 hover:border-purple-700 active:scale-95 transition group rounded-full bg-transparent"
                      onClick={handleCapture}
                    >
                      <span className="block w-10 h-10 bg-purple-600 group-hover:bg-purple-700 transition rounded-full"></span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover bg-black shadow-2xl border border-purple-200"
                      />
                      {/* Overlay action buttons on right */}
                      {capturedImage && (!activeTool || (activeTool !== 'text' || !textBox.isEditing)) && (
                        <div className="absolute right-1.5 top-[45px] flex flex-col gap-3 z-30">
                          <button onClick={() => { setActiveTool('text'); updateTextBox({ isEditing: true }); }} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:scale-110 active:scale-95 transition-transform duration-150">
                            <MdTextFields className="text-white text-lg font-extrabold" />
                          </button>
                          <button onClick={() => setActiveTool('sticker')} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:scale-110 active:scale-95 transition-transform duration-150">
                            <MdEmojiEmotions className="text-white text-lg font-extrabold" />
                          </button>
                          <button onClick={() => setActiveTool('gif')} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:scale-110 active:scale-95 transition-transform duration-150">
                            <MdGif className="text-white text-lg font-extrabold" />
                          </button>
                          <button onClick={() => setActiveTool('draw')} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-white/20 shadow-md hover:scale-110 active:scale-95 transition-transform duration-150">
                            <MdBrush className="text-white text-lg font-extrabold" />
                          </button>
                        </div>
                      )}
                      {/* Tool overlays (centered on image, over 9:16 ratio) */}
                      {capturedImage && (
                        <>
                          {/* Text editing controls - only show when editing */}
                          {activeTool === 'text' && textBox.isEditing && (
                            <>
                              {/* Color Picker - positioned even lower and more right */}
                              <div className="absolute top-28 right-2 flex flex-col gap-2 justify-center items-center z-50 text-controls">
                                {[{ color: '#ffffff', label: 'White' }, { color: '#000000', label: 'Black' }, { color: '#ff1744', label: 'Red' }, { color: '#ffeb3b', label: 'Yellow' }, { color: '#2979ff', label: 'Blue' }].map(opt => (
                                  <button
                                    key={opt.color}
                                    className="w-6 h-6 rounded-full border-2 border-white focus:outline-none"
                                    style={{ background: opt.color, borderColor: textColor === opt.color ? '#a855f7' : '#fff' }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setTextColor(opt.color);
                                    }}
                                  />
                                ))}
                              </div>
                              {/* Font Selector - positioned at bottom right */}
                              <div className="absolute bottom-4 right-4 flex gap-2 bg-white/90 rounded-lg px-4 py-3 shadow z-50 text-controls">
                                <select
                                  value={textFont}
                                  onChange={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTextFont(e.target.value);
                                  }}
                                  className="bg-transparent text-sm border-none outline-none text-purple-600 font-medium"
                                  style={{ minWidth: '80px', fontSize: '13px' }}
                                >
                                  {fontOptions.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                      {font.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Size Slider - positioned at left center of the 9:16 modal */}
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center z-50 text-controls" style={{ height: 120 }}>
                                <Slider
                                  vertical
                                  min={16}
                                  max={60}
                                  value={textSize}
                                  onChange={setTextSize}
                                  trackStyle={{ backgroundColor: '#a855f7', width: 6, borderRadius: 6 }}
                                  handleStyle={{ backgroundColor: '#fff', border: '2px solid #a855f7', width: 20, height: 20, marginLeft: -7, marginTop: -3, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', transition: 'box-shadow 0.2s' }}
                                  railStyle={{ backgroundColor: '#e5e7eb', width: 6, borderRadius: 6 }}
                                />
                              </div>
                              {/* Alignment, Bold, Highlight Controls - positioned at bottom left */}
                              <div className="absolute bottom-4 left-4 flex gap-2 bg-white/90 rounded-lg px-3 py-2 shadow z-50 text-controls" style={{ minWidth: '66px' }}>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTextAlign('left');
                                  }} 
                                  className={`text-sm font-medium ${textAlign==='left'?"font-bold text-purple-600":"text-gray-700"}`}
                                  style={{ fontSize: '13px' }}
                                >
                                  L
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTextAlign('center');
                                  }} 
                                  className={`text-sm font-medium ${textAlign==='center'?"font-bold text-purple-600":"text-gray-700"}`}
                                  style={{ fontSize: '13px' }}
                                >
                                  C
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTextAlign('right');
                                  }} 
                                  className={`text-sm font-medium ${textAlign==='right'?"font-bold text-purple-600":"text-gray-700"}`}
                                  style={{ fontSize: '13px' }}
                                >
                                  R
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsBold(b=>!b);
                                  }} 
                                  className={`text-sm font-medium ${isBold?"font-bold text-purple-600":"text-gray-700"}`}
                                  style={{ fontSize: '13px' }}
                                >
                                  B
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsHighlight(h=>!h);
                                  }} 
                                  className={`text-sm font-medium ${isHighlight?"font-bold text-purple-600":"text-gray-700"}`}
                                  style={{ fontSize: '13px' }}
                                >
                                  A
                                </button>
                              </div>
                              {/* Done Button - positioned at top right of the 9:16 modal */}
                              <button
                                className="absolute top-4 right-4 z-50 bg-purple-600 text-white px-3 py-1 rounded shadow"
                                onClick={handleDoneClick}
                                type="button"
                              >
                                Done
                              </button>
                            </>
                          )}
                          {/* 1. Show text box and controls ONLY when editing */}
                          {activeTool === 'text' && textBox.isEditing && (
                            <>
                              <div
                                ref={textBoxRef}
                                style={{
                                  position: 'absolute',
                                  left: textBox.left,
                                  top: textBox.top,
                                  width: textBox.width,
                                  height: textBox.height,
                                  transform: `rotate(${textBox.rotation}deg)`,
                                  zIndex: 100,
                                  background: 'rgba(0,0,0,0.05)',
                                  border: '1px dashed #a855f7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'text',
                                  userSelect: 'text',
                                  color: textColor,
                                  fontSize: textSize,
                                  fontWeight: isBold ? 'bold' : 'normal',
                                  textAlign: textAlign,
                                  fontFamily: textFont,
                                  minWidth: 60,
                                  minHeight: 40,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                                onDoubleClick={handleTextBoxDoubleClick}
                                onTouchStart={(e) => { if (e.touches.length === 2) updateTextBox({ isEditing: false }); }}
                              >
                                <textarea
                                  ref={(textarea) => {
                                    if (textarea) {
                                      textarea.focus();
                                      textarea.style.height = 'auto';
                                      textarea.style.height = textarea.scrollHeight + 'px';
                                    }
                                  }}
                                  className="w-full bg-transparent outline-none text-center resize-none overflow-hidden"
                                  placeholder="Type here"
                                  style={{
                                    color: textColor,
                                    fontSize: textSize,
                                    fontWeight: isBold ? 'bold' : 'normal',
                                    background: 'transparent',
                                    textAlign: textAlign,
                                    fontFamily: textFont,
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                    minHeight: '40px',
                                    lineHeight: '1.2',
                                    padding: '4px',
                                  }}
                                  value={textBox.value}
                                  onChange={handleTextareaChange}
                                  onBlur={(e) => {
                                    const relatedTarget = e.relatedTarget;
                                    if (!relatedTarget || !relatedTarget.closest('.text-controls')) {
                                      handleTextBoxBlur();
                                    }
                                  }}
                                />
                              </div>
                              <Moveable
                                target={textBoxRef}
                                container={null}
                                origin={false}
                                draggable={true}
                                rotatable={true}
                                throttleDrag={0}
                                throttleRotate={0}
                                keepRatio={false}
                                edge={false}
                                onDrag={({ left, top }) => updateTextBox({ left, top })}
                                onRotate={({ beforeRotate }) => updateTextBox({ rotation: beforeRotate })}
                                bounds={{ left: 0, top: 0, right: 320, bottom: 568 }} // modal bounds
                                pinchable={true}
                                rotationPosition="top"
                                onClick={() => updateTextBox({ isEditing: true })}
                                onTouchStart={() => updateTextBox({ isEditing: false })}
                              />
                            </>
                          )}
                          {/* 2. After Done, show text box only if textBox.value is not empty and not editing */}
                          {!textBox.isEditing && textBox.value && (
                            <span
                              style={{
                                position: 'absolute',
                                left: textBox.left,
                                top: textBox.top,
                                transform: `rotate(${textBox.rotation}deg)` ,
                                zIndex: 100,
                                color: textColor,
                                fontSize: textSize,
                                fontWeight: isBold ? 'bold' : 'normal',
                                textAlign: textAlign,
                                fontFamily: textFont,
                                minWidth: 60,
                                minHeight: 40,
                                lineHeight: '1.2',
                                padding: '4px',
                                background: 'transparent',
                                border: 'none',
                                boxShadow: 'none',
                                display: 'block',
                                cursor: 'move',
                                userSelect: 'text',
                                whiteSpace: 'pre-line',
                              }}
                              onDoubleClick={handleTextBoxDoubleClick}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startLeft = textBox.left;
                                const startTop = textBox.top;
                                const handleMouseMove = (moveEvent) => {
                                  const dx = moveEvent.clientX - startX;
                                  const dy = moveEvent.clientY - startY;
                                  // Clamp to modal bounds (0,0) to (320-60, 568-40)
                                  const newLeft = Math.max(0, Math.min(320 - 60, startLeft + dx));
                                  const newTop = Math.max(0, Math.min(568 - 40, startTop + dy));
                                  updateTextBox({ left: newLeft, top: newTop });
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                              onTouchStart={(e) => {
                                if (e.touches.length !== 1) return;
                                const touch = e.touches[0];
                                const startX = touch.clientX;
                                const startY = touch.clientY;
                                const startLeft = textBox.left;
                                const startTop = textBox.top;
                                const handleTouchMove = (moveEvent) => {
                                  const t = moveEvent.touches[0];
                                  const dx = t.clientX - startX;
                                  const dy = t.clientY - startY;
                                  const newLeft = Math.max(0, Math.min(320 - 60, startLeft + dx));
                                  const newTop = Math.max(0, Math.min(568 - 40, startTop + dy));
                                  updateTextBox({ left: newLeft, top: newTop });
                                };
                                const handleTouchEnd = () => {
                                  document.removeEventListener('touchmove', handleTouchMove);
                                  document.removeEventListener('touchend', handleTouchEnd);
                                };
                                document.addEventListener('touchmove', handleTouchMove);
                                document.addEventListener('touchend', handleTouchEnd);
                              }}
                            >
                              {textBox.value}
                            </span>
                          )}
                          {/* Render stickers */}
                          {stickers.map((sticker) => (
                            <div
                              key={sticker.id}
                              ref={(el) => {
                                stickerRefs.current[sticker.id] = el;
                              }}
                              data-id={sticker.id}
                              style={{
                                position: 'absolute',
                                left: sticker.left + 'px',
                                top: sticker.top + 'px',
                                fontSize: sticker.size + 'px',
                                transform: `rotate(${sticker.rotation}deg)`,
                                zIndex: 10, // Lower z-index
                                cursor: 'move',
                                userSelect: 'none',
                              }}
                              className="sticker-item"
                              onMouseDown={(e) => handleStickerDragStart(e, sticker.id)}
                              onTouchStart={(e) => handleStickerDragStart(e, sticker.id)}
                            >
                              {sticker.emoji}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSticker(sticker.id);
                                }}
                                className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs opacity-70 hover:opacity-100 transition-opacity"
                                style={{ margin: '-10px -10px' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {/* Render GIFs */}
                          {gifs.map((gif) => (
                            <div
                              key={gif.id}
                              ref={(el) => {
                                gifRefs.current[gif.id] = el;
                              }}
                              data-id={gif.id}
                              style={{
                                position: 'absolute',
                                left: gif.left + 'px',
                                top: gif.top + 'px',
                                width: gif.width + 'px',
                                height: gif.height + 'px',
                                transform: `rotate(${gif.rotation}deg)`,
                                zIndex: 10, // Lower z-index
                                cursor: 'move',
                                userSelect: 'none',
                              }}
                              className="gif-item"
                              onMouseDown={(e) => handleGifDragStart(e, gif.id)}
                              onTouchStart={(e) => handleGifDragStart(e, gif.id)}
                            >
                              <img
                                src={gif.url}
                                alt="GIF"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain', // Preserve aspect ratio
                                  borderRadius: '8px',
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGif(gif.id);
                                }}
                                className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs opacity-70 hover:opacity-100 transition-opacity"
                                style={{ margin: '-10px -10px' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {activeTool === 'sticker' && (
                            <div className="absolute inset-0 flex items-center justify-center z-40">
                              <div className="bg-white/95 rounded-lg shadow-2xl p-4 max-w-sm max-h-96 overflow-hidden">
                                <div className="flex justify-between items-center mb-3">
                                  <h3 className="text-lg font-semibold text-gray-800">Choose Emoji</h3>
                                  <button 
                                    onClick={() => setActiveTool(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                  <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    width="100%"
                                    height={300}
                                    searchDisabled={false}
                                    skinTonesDisabled={true}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {activeTool === 'gif' && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                              <div className="relative w-[320px] h-[560px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                                  <h3 className="text-lg font-semibold text-gray-800">Select a GIF</h3>
                                  <button 
                                    onClick={() => setActiveTool(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                  <GifPicker
                                    tenorApiKey="AIzaSyCiSggXkfWXl4uYEMh5Y5MNPE8QW4WRrdI"
                                    onGifClick={(gif) => handleGifSelect({
                                      url: gif.url,
                                      title: gif.content_description || gif.title || 'GIF'
                                    })}
                                    width={290}
                                    height={420}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {activeTool === 'draw' && (
                            <>
                              {/* Drawing Canvas */}
                              <canvas
                                ref={drawingCanvasRef}
                                className="absolute inset-0 w-full h-full cursor-crosshair"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={(e) => {
                                  e.preventDefault();
                                  const touch = e.touches[0];
                                  const mouseEvent = new MouseEvent('mousedown', {
                                    clientX: touch.clientX,
                                    clientY: touch.clientY
                                  });
                                  startDrawing(mouseEvent);
                                }}
                                onTouchMove={(e) => {
                                  e.preventDefault();
                                  const touch = e.touches[0];
                                  const mouseEvent = new MouseEvent('mousemove', {
                                    clientX: touch.clientX,
                                    clientY: touch.clientY
                                  });
                                  draw(mouseEvent);
                                }}
                                onTouchEnd={stopDrawing}
                              />
                              
                              {/* Undo Button - Top Left */}
                              <button
                                className={`absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-lg shadow-lg transition-all ${
                                  historyIndex > 0 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                                onClick={undoDrawing}
                                disabled={historyIndex <= 0}
                                title="Undo"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {/* Done Button - Top Right */}
                              <button
                                className="absolute top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors font-medium"
                                onClick={() => setActiveTool(null)}
                                title="Done"
                              >
                                Done
                              </button>
                              
                              {/* Brush Size Slider - Left Side Vertical */}
                              <div className="absolute left-4 top-20 bg-white/90 rounded-lg p-2 shadow-lg">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="relative h-16 w-6 flex items-center justify-center">
                                    <input
                                      type="range"
                                      min="1"
                                      max="20"
                                      value={brushSize}
                                      onChange={(e) => handleBrushSizeChange(parseInt(e.target.value))}
                                      className="absolute w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                      style={{
                                        background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(brushSize - 1) / 19 * 100}%, #e5e7eb ${(brushSize - 1) / 19 * 100}%, #e5e7eb 100%)`,
                                        transform: 'rotate(-90deg) translateX(-8px) translateY(-8px)',
                                        transformOrigin: 'center'
                                      }}
                                    />
                                  </div>
                                  <div className="w-2 h-2 bg-purple-600 rounded-full" style={{ width: brushSize, height: brushSize }}></div>
                                </div>
                              </div>
                              
                              {/* Drawing Controls */}
                              <div className="absolute right-1.5 top-[45px] flex flex-col gap-3 z-30">
                                                          {/* Color Picker */}
                                  <div className="bg-white/90 rounded-lg p-2 shadow-lg relative">
                                    <div className="flex flex-col gap-1">
                                      {drawingColors.map((colorOption) => (
                                        <button
                                          key={colorOption.color}
                                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                                            drawingColor === colorOption.color && !isEraser
                                              ? 'border-purple-600 scale-110'
                                              : 'border-white hover:scale-105'
                                          }`}
                                          style={{ backgroundColor: colorOption.color }}
                                          onClick={() => handleColorChange(colorOption.color)}
                                          title={colorOption.label}
                                        />
                                      ))}
                                      {/* Custom Color Picker Button */}
                                      <button
                                        className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                          drawingColor === customColor && !isEraser
                                            ? 'border-purple-600 scale-110'
                                            : 'border-white hover:scale-105'
                                        }`}
                                        style={{ 
                                          background: `linear-gradient(45deg, ${customColor} 0%, ${customColor} 50%, #e5e7eb 50%, #e5e7eb 100%)`
                                        }}
                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                        title="Custom Color"
                                      >
                                        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    {/* Custom Color Picker Dropdown */}
                                    {showColorPicker && (
                                      <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50">
                                        <div className="flex flex-col gap-2">
                                          <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                                          />
                                          <div className="flex gap-1 flex-wrap">
                                            {[
                                              '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00',
                                              '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff',
                                              '#ff00ff', '#ff0080', '#ff4000', '#ffbf00', '#80ff40',
                                              '#40ff80', '#00ffbf', '#00bfff', '#0040ff', '#4000ff'
                                            ].map((color) => (
                                              <button
                                                key={color}
                                                className="w-4 h-4 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                                onClick={() => handleCustomColorChange(color)}
                                                title={color}
                                              />
                                            ))}
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                              onClick={() => handleCustomColorChange(customColor)}
                                            >
                                              Apply
                                            </button>
                                            <button
                                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                              onClick={() => setShowColorPicker(false)}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                
                                {/* Brush/Eraser Toggle */}
                                <div className="bg-white/90 rounded-lg p-2 shadow-lg">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
                                        !isEraser ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                                      }`}
                                      onClick={handleBrush}
                                      title="Brush"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M15.75 3.75L16.5 4.5L15.75 5.25L15 4.5L15.75 3.75Z" />
                                        <path d="M3.75 15.75L4.5 16.5L5.25 15.75L4.5 15L3.75 15.75Z" />
                                        <path d="M3.75 3.75L4.5 4.5L5.25 3.75L4.5 3L3.75 3.75Z" />
                                        <path d="M15.75 15.75L16.5 16.5L15.75 17.25L15 16.5L15.75 15.75Z" />
                                        <path d="M9.75 12.75L10.5 13.5L11.25 12.75L10.5 12L9.75 12.75Z" />
                                        <path d="M6.75 9.75L7.5 10.5L8.25 9.75L7.5 9L6.75 9.75Z" />
                                      </svg>
                                    </button>
                                    <button
                                      className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
                                        isEraser ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                                      }`}
                                      onClick={handleEraser}
                                      title="Eraser"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.5 3.5L16.5 11.5L8.5 19.5L2.5 13.5L8.5 7.5L8.5 3.5Z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Clear Canvas Button */}
                                <button
                                  className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                                  onClick={clearCanvas}
                                  title="Clear Canvas"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      
                      {/* Bottom action buttons for desktop captured image */}
                      {capturedImage && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                          <button
                            className="py-2 px-6 bg-gray-500/80 text-white rounded-lg font-medium hover:bg-gray-600/80 transition-colors"
                            onClick={() => setCapturedImage(null)}
                          >
                            Retake
                          </button>
                          <button
                            className={`py-2 px-6 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 ${
                              isUploading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={handleUsePhoto}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Uploading...
                              </>
                            ) : (
                              'Use Photo'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
            </div>
          </div>
        )
      )}


      {showMoveable && activeTool === 'text' && (
        <>
        </>
      )}

      {/* Story Viewer */}
      {showStoryViewer && (
        <StoryViewer
          stories={currentViewingStories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleCloseStoryViewer}
          onNext={handleNextStory}
          onPrevious={handlePreviousStory}
          onStorySeen={handleStorySeen}
          isLatestStoryFirst={isLatestStoryFirst}
          currentUser={meData?.getMe || user}
          onDeleteStory={handleDeleteStory}
          allUsersWithStories={allUsersWithStories}
          currentUserIndex={currentUserIndex}
          usersData={usersData?.users}
          meData={meData?.getMe}
        />
      )}
    </div>
  );
};

export default StoryBar; 