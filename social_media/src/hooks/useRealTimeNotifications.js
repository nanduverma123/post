import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER_NOTIFICATIONS, GET_USER_NOTIFICATIONS_SAFE } from '../graphql/mutations';
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '../utils/notificationSound';
import { useNotifications } from '../context/NotificationContext';
import io from 'socket.io-client';

export const useRealTimeNotifications = () => {
  const [popupNotifications, setPopupNotifications] = useState([]);
  const previousNotificationsRef = useRef([]);
  const isFirstLoadRef = useRef(true);
  const [useSafeQuery, setUseSafeQuery] = useState(true); // Start with safe query
  const socketRef = useRef(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  
  // Get notification context for red dot updates (with safe fallback)
  const { addNewNotification, incrementUnreadCount, user } = useNotifications();
  const userId = user?.id;

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      const granted = await requestNotificationPermission();
      setHasNotificationPermission(granted);
    };
    requestPermission();
  }, []);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    if (!userId) {
      console.log('❌ No userId available for socket connection');
      return;
    }

    // Convert userId to string if it's an object
    const userIdString = typeof userId === 'object' && userId.data 
      ? Buffer.from(userId.data).toString('hex') 
      : userId.toString();

    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 Connecting to socket with userId:', userIdString);
    }

    try {
      socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        query: { userId: userIdString }, // Use query instead of auth for compatibility
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 10000
      });

      socketRef.current.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Connected to notification socket for user:', userIdString);
        }
        // Join user's personal room for notifications
        socketRef.current.emit('join', userIdString);
        
        // Make socket available globally for debugging in development
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
          window.socketRef = socketRef;
        }
      });

      socketRef.current.on('newNotification', (notification) => {
        // Only show popup for specific notification types: like, comment, comment_like, reply, reply_like, follow, reel_like, reel_comment
        const showableTypes = ['like', 'comment', 'comment_like', 'reply', 'reply_like', 'follow', 'reel_like', 'reel_comment'];
        if (showableTypes.includes(notification.type)) {
          handleNewNotification(notification);
        }
      });

      // Listen for share notifications
      socketRef.current.on('shareNotification', (shareData) => {
        console.log('📤 Share notification received:', shareData);
        handleShareNotification(shareData);
      });

      socketRef.current.on('disconnect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Disconnected from notification socket');
        }
      });

      socketRef.current.on('connect_error', (error) => {
        // Silently handle connection errors - socket.io will retry automatically
        // Only log in development for debugging
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Socket connection error (retrying automatically)');
        }
      });

      socketRef.current.on('error', (error) => {
        // Silently handle socket errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Socket error (handled)');
        }
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Socket connection failed, using polling only:', error.message);
      }
      // Fallback: continue without socket, polling will handle notifications
    }
  }, [userId]);



  const { data: notificationsData, loading, error } = useQuery(
    useSafeQuery ? GET_USER_NOTIFICATIONS_SAFE : GET_USER_NOTIFICATIONS, 
    {
      variables: { userId },
      skip: !userId,
      pollInterval: 5000, // Poll every 5 seconds (reduced frequency as socket handles real-time)
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
      onError: (error) => {
        console.error('Error in useRealTimeNotifications:', error);
        // If the error is about null names and we're not already using safe query, switch to safe query
        if (error.message.includes('Cannot return null for non-nullable field User.name') && !useSafeQuery) {
          console.log('Switching to safe query in useRealTimeNotifications');
          setUseSafeQuery(true);
        }
      },
    }
  );

  // Handle new notification (from socket or polling)
  const handleNewNotification = (notification) => {
    console.log('🔔 NEW NOTIFICATION RECEIVED:', notification);
    
    // Play notification sound
    try {
      playNotificationSound(notification.type);
      console.log('🔊 Sound played for notification type:', notification.type);
    } catch (error) {
      console.log('❌ Could not play notification sound:', error);
    }

    // Show browser notification if permission granted
    if (hasNotificationPermission) {
      const title = getNotificationTitle(notification);
      const body = getNotificationBody(notification);
      showBrowserNotification(title, {
        body,
        icon: notification.sender?.profileImage || '/favicon.ico',
        tag: notification.id, // Prevent duplicate notifications
        requireInteraction: false // Auto-dismiss after a few seconds
      });
    }
    
    // Add to popup queue
    setPopupNotifications(prev => {
      // Prevent duplicates
      const filtered = prev.filter(p => p.id !== notification.id);
      const newNotifications = [...filtered, notification];
      
      // Keep only latest 5 notifications in popup
      return newNotifications.slice(-5);
    });

    // Update red dot on heart icon (add to notification context)
    if (addNewNotification) {
      console.log('🔔 Adding notification to context:', notification);
      addNewNotification(notification);
      console.log('✅ Red dot updated for notification:', notification.type);
    } else if (incrementUnreadCount) {
      incrementUnreadCount();
      console.log('✅ Red dot incremented for notification:', notification.type);
    } else {
      console.log('❌ No addNewNotification function available');
    }

    // Auto-remove notification after 8 seconds
    setTimeout(() => {
      setPopupNotifications(prev => 
        prev.filter(p => p.id !== notification.id)
      );
    }, 8000);
  };

  // Handle share notification (special case)
  const handleShareNotification = (shareData) => {
    console.log('📤 SHARE NOTIFICATION RECEIVED:', shareData);
    
    // Play notification sound
    try {
      playNotificationSound('share');
      console.log('🔊 Sound played for share notification');
    } catch (error) {
      console.log('❌ Could not play notification sound:', error);
    }

    // Show browser notification if permission granted
    if (hasNotificationPermission) {
      showBrowserNotification(shareData.message, {
        body: `Check out the ${shareData.contentType} they shared with you`,
        icon: shareData.senderProfileImage || '/favicon.ico',
        tag: `share_${shareData.timestamp}`, // Prevent duplicate notifications
        requireInteraction: false // Auto-dismiss after a few seconds
      });
    }
    
    // Create a custom notification popup for share
    const shareNotificationId = `share_${shareData.timestamp}`;
    const shareNotification = {
      id: shareNotificationId,
      type: 'share',
      message: shareData.message,
      senderName: shareData.senderName,
      senderProfileImage: shareData.senderProfileImage,
      contentType: shareData.contentType,
      timestamp: shareData.timestamp,
      createdAt: new Date().toISOString()
    };
    
    // Add to popup queue
    setPopupNotifications(prev => {
      // Prevent duplicates
      const filtered = prev.filter(p => p.id !== shareNotificationId);
      const newNotifications = [...filtered, shareNotification];
      
      // Keep only latest 5 notifications in popup
      return newNotifications.slice(-5);
    });

    // Auto-remove notification after 8 seconds
    setTimeout(() => {
      setPopupNotifications(prev => 
        prev.filter(p => p.id !== shareNotificationId)
      );
    }, 8000);
  };

  // Helper functions for browser notifications
  const getNotificationTitle = (notification) => {
    const senderName = notification.sender?.name || notification.sender?.username || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'comment_like':
        return `${senderName} liked your comment`;
      case 'reply':
        return `${senderName} replied to your comment`;
      case 'reply_like':
        return `${senderName} liked your reply`;
      case 'reel_like':
        return `${senderName} liked your reel`;
      case 'reel_comment':
        return `${senderName} commented on your reel`;
      case 'follow':
        return `${senderName} started following you`;
      default:
        return 'New notification';
    }
  };

  const getNotificationBody = (notification) => {
    switch (notification.type) {
      case 'comment':
        return notification.commentText ? `"${notification.commentText}"` : 'View the comment';
      case 'reply':
        return notification.commentText ? `"${notification.commentText}"` : 'View the reply';
      case 'reel_comment':
        return notification.commentText ? `"${notification.commentText}"` : 'View the comment';
      case 'like':
        return 'Check out your post';
      case 'reel_like':
        return 'Check out your reel';
      case 'comment_like':
        return 'Your comment got some love!';
      case 'reply_like':
        return 'Your reply got some love!';
      case 'follow':
        return 'Check out their profile';
      default:
        return 'Tap to view';
    }
  };

  useEffect(() => {
    if (notificationsData?.getUserNotifications && !loading) {
      const currentNotifications = notificationsData.getUserNotifications;
      
      // Skip first load to avoid showing all existing notifications as popups
      if (isFirstLoadRef.current) {
        previousNotificationsRef.current = currentNotifications;
        isFirstLoadRef.current = false;
        console.log('🔄 Initial notifications loaded, skipping popup display');
        return;
      }

      // Find new notifications by comparing with previous data
      const newNotifications = currentNotifications.filter(current => {
        const isNew = !previousNotificationsRef.current.some(prev => prev.id === current.id);
        const isRecent = new Date(current.createdAt) > new Date(Date.now() - 60000); // Last 60 seconds (more time for polling)
        const isRelevantType = ['like', 'comment', 'comment_like', 'reply', 'reply_like', 'reel_like', 'reel_comment', 'follow'].includes(current.type);
        return isNew && isRecent && isRelevantType;
      });

      if (newNotifications.length > 0) {
        console.log('🆕 New notifications found via polling:', newNotifications);
        
        // Process each new notification
        newNotifications.forEach((notification, index) => {
          setTimeout(() => {
            handleNewNotification(notification);
          }, index * 300); // Stagger notifications if multiple
        });
      }

      // Update previous notifications reference
      previousNotificationsRef.current = currentNotifications;
    }
  }, [notificationsData, loading]);

  const removePopupNotification = (notificationId) => {
    setPopupNotifications(prev => 
      prev.filter(p => p.id !== notificationId)
    );
  };

  const clearAllPopups = () => {
    setPopupNotifications([]);
  };

  const addPopupNotification = (notification) => {
    handleNewNotification(notification);
  };

  return {
    popupNotifications,
    removePopupNotification,
    clearAllPopups,
    addPopupNotification,
    loading,
    error
  };
};

export default useRealTimeNotifications;