// Shared storage utility for simulating real-time data sharing between users
// In a real app, this would be handled by the backend/database

const SHARED_REPLIES_KEY = 'socialApp_sharedReplies_v2';
const SHARED_NOTIFICATIONS_KEY = 'socialApp_sharedNotifications_v2';
const SHARED_COMMENT_LIKES_KEY = 'socialApp_sharedCommentLikes_v2';

// Get shared replies from localStorage
export const getSharedReplies = () => {
  try {
    const data = localStorage.getItem(SHARED_REPLIES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading shared replies:', error);
    return {};
  }
};

// Save shared replies to localStorage
export const saveSharedReplies = (replies) => {
  try {
    const dataString = JSON.stringify(replies);
    localStorage.setItem(SHARED_REPLIES_KEY, dataString);
    
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('sharedRepliesUpdate', {
      detail: replies
    }));
    
    // Also trigger storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: SHARED_REPLIES_KEY,
      newValue: dataString,
      oldValue: localStorage.getItem(SHARED_REPLIES_KEY)
    }));
    
    console.log('💾 Saved shared replies and triggered events:', replies);
  } catch (error) {
    console.error('Error saving shared replies:', error);
  }
};

// Add a reply to shared storage
export const addSharedReply = (commentId, reply) => {
  const sharedReplies = getSharedReplies();
  
  if (!sharedReplies[commentId]) {
    sharedReplies[commentId] = [];
  }
  
  sharedReplies[commentId].push(reply);
  saveSharedReplies(sharedReplies);
  
  console.log('📤 Added reply to shared storage:', { commentId, reply });
};

// Get replies for a specific comment
export const getRepliesForComment = (commentId) => {
  const sharedReplies = getSharedReplies();
  return sharedReplies[commentId] || [];
};

// Get shared notifications
export const getSharedNotifications = () => {
  try {
    const data = localStorage.getItem(SHARED_NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading shared notifications:', error);
    return [];
  }
};

// Add shared notification
export const addSharedNotification = (notification) => {
  try {
    const notifications = getSharedNotifications();
    notifications.push(notification);
    const dataString = JSON.stringify(notifications);
    localStorage.setItem(SHARED_NOTIFICATIONS_KEY, dataString);
    
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('sharedNotificationsUpdate', {
      detail: notifications
    }));
    
    // Also trigger storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: SHARED_NOTIFICATIONS_KEY,
      newValue: dataString,
      oldValue: localStorage.getItem(SHARED_NOTIFICATIONS_KEY)
    }));
    
    console.log('📤 Added notification to shared storage and triggered events:', notification);
  } catch (error) {
    console.error('Error saving shared notification:', error);
  }
};

// Get shared comment likes
export const getSharedCommentLikes = () => {
  try {
    const data = localStorage.getItem(SHARED_COMMENT_LIKES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading shared comment likes:', error);
    return {};
  }
};

// Save shared comment likes
export const saveSharedCommentLikes = (likes) => {
  try {
    const dataString = JSON.stringify(likes);
    localStorage.setItem(SHARED_COMMENT_LIKES_KEY, dataString);
    
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('sharedCommentLikesUpdate', {
      detail: likes
    }));
    
    // Also trigger storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: SHARED_COMMENT_LIKES_KEY,
      newValue: dataString,
      oldValue: localStorage.getItem(SHARED_COMMENT_LIKES_KEY)
    }));
    
    console.log('💾 Saved shared comment likes and triggered events:', likes);
  } catch (error) {
    console.error('Error saving shared comment likes:', error);
  }
};

// Toggle comment like in shared storage
export const toggleSharedCommentLike = (commentId, userId, userName) => {
  const likes = getSharedCommentLikes();
  const likeKey = `${commentId}_${userId}`;
  
  if (likes[likeKey]) {
    // Unlike
    delete likes[likeKey];
    console.log('👎 Removed like from shared storage:', { commentId, userId });
  } else {
    // Like
    likes[likeKey] = {
      commentId,
      userId,
      userName,
      likedAt: new Date().toISOString()
    };
    console.log('👍 Added like to shared storage:', { commentId, userId, userName });
  }
  
  saveSharedCommentLikes(likes);
  return !likes[likeKey]; // Return new like state
};

// Check if comment is liked by user
export const isCommentLikedByUser = (commentId, userId) => {
  const likes = getSharedCommentLikes();
  return !!likes[`${commentId}_${userId}`];
};

// Listen for storage changes (for real-time updates)
export const listenForSharedUpdates = (onRepliesUpdate, onNotificationsUpdate, onCommentLikesUpdate) => {
  const handleStorageChange = (e) => {
    console.log('📡 Storage event received:', e.key);
    if (e.key === SHARED_REPLIES_KEY && onRepliesUpdate) {
      const newReplies = e.newValue ? JSON.parse(e.newValue) : {};
      console.log('📡 Processing replies update:', newReplies);
      onRepliesUpdate(newReplies);
    } else if (e.key === SHARED_NOTIFICATIONS_KEY && onNotificationsUpdate) {
      const newNotifications = e.newValue ? JSON.parse(e.newValue) : [];
      onNotificationsUpdate(newNotifications);
    } else if (e.key === SHARED_COMMENT_LIKES_KEY && onCommentLikesUpdate) {
      const newLikes = e.newValue ? JSON.parse(e.newValue) : {};
      console.log('📡 Processing comment likes update:', newLikes);
      onCommentLikesUpdate(newLikes);
    }
  };

  const handleCustomRepliesUpdate = (e) => {
    console.log('📡 Custom replies event received:', e.detail);
    if (onRepliesUpdate) {
      onRepliesUpdate(e.detail);
    }
  };

  const handleCustomNotificationsUpdate = (e) => {
    console.log('📡 Custom notifications event received:', e.detail);
    if (onNotificationsUpdate) {
      onNotificationsUpdate(e.detail);
    }
  };

  const handleCustomCommentLikesUpdate = (e) => {
    console.log('📡 Custom comment likes event received:', e.detail);
    if (onCommentLikesUpdate) {
      onCommentLikesUpdate(e.detail);
    }
  };

  // Listen for both storage events (cross-tab) and custom events (same-tab)
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('sharedRepliesUpdate', handleCustomRepliesUpdate);
  window.addEventListener('sharedNotificationsUpdate', handleCustomNotificationsUpdate);
  window.addEventListener('sharedCommentLikesUpdate', handleCustomCommentLikesUpdate);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('sharedRepliesUpdate', handleCustomRepliesUpdate);
    window.removeEventListener('sharedNotificationsUpdate', handleCustomNotificationsUpdate);
    window.removeEventListener('sharedCommentLikesUpdate', handleCustomCommentLikesUpdate);
  };
};