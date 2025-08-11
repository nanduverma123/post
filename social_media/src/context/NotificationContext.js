import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_UNREAD_NOTIFICATIONS_COUNT, GET_USER_NOTIFICATIONS_SAFE, MARK_NOTIFICATIONS_AS_READ } from '../graphql/mutations';
import { GetTokenFromCookie } from '../components/getToken/GetToken';

const NotificationContext = createContext();

// Helper function to check if notification type should show red dot
const shouldShowRedDot = (notificationType) => {
  return notificationType === 'like' || 
         notificationType === 'comment' || 
         notificationType === 'comment_like' ||
         notificationType === 'reply' ||
         notificationType === 'reply_like' ||
         notificationType === 'reel_like' ||
         notificationType === 'reel_comment';
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return default values instead of throwing error
    return {
      unreadCount: 0,
      refreshUnreadCount: () => {},
      markAsRead: () => {},
      incrementUnreadCount: () => {},
      newNotifications: [],
      addNewNotification: () => {},
      removeNotification: () => {},
      clearAllNotifications: () => {},
      cleanupOldNotifications: () => {},
      user: null,
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState([]);

  // Auto-delete notifications after 7 days
  const cleanupOldNotifications = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Clean up local notifications
    setNewNotifications(prev => 
      prev.filter(notification => {
        const notificationDate = new Date(notification.createdAt || notification.timestamp);
        return notificationDate > sevenDaysAgo;
      })
    );
    
    // Log cleanup for debugging
    console.log('🧹 Cleaned up notifications older than 7 days:', {
      cutoffDate: sevenDaysAgo.toISOString(),
      currentTime: new Date().toISOString()
    });
  };

  useEffect(() => {
    try {
      const decodedUser = GetTokenFromCookie();
      setUser(decodedUser);
    } catch (error) {
      console.error('Error getting user token:', error);
    }
  }, []);

  // Cleanup old notifications every hour
  useEffect(() => {
    // Initial cleanup
    cleanupOldNotifications();
    
    // Set up interval to clean up every hour
    const cleanupInterval = setInterval(cleanupOldNotifications, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Query for all notifications to filter on frontend
  const { data: notificationsData, refetch: refetchNotifications } = useQuery(
    GET_USER_NOTIFICATIONS_SAFE,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      pollInterval: 15000, // Reduced polling to avoid errors
      fetchPolicy: 'cache-and-network', // Use cache first
      errorPolicy: 'ignore', // Ignore errors to prevent data loss
      notifyOnNetworkStatusChange: false, // Prevent loading state changes
      onCompleted: (data) => {
        if (data?.getUserNotifications) {
          // Filter out notifications older than 7 days
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const recentNotifications = data.getUserNotifications.filter(notification => {
            const notificationDate = new Date(notification.createdAt || notification.timestamp);
            return notificationDate > sevenDaysAgo;
          });
          
          // Filter notifications to only count like, comment, and comment_like types
          const filteredNotifications = recentNotifications.filter(notification => 
            shouldShowRedDot(notification.type)
          );
          
          // Count unread notifications from filtered list
          const unreadFiltered = filteredNotifications.filter(notification => !notification.isRead);
          setUnreadCount(unreadFiltered.length);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Filtered notifications for red dot:', {
              total: data.getUserNotifications.length,
              recent: recentNotifications.length,
              filtered: filteredNotifications.length,
              unreadFiltered: unreadFiltered.length,
              types: filteredNotifications.map(n => n.type)
            });
          }
        }
      },
      onError: (error) => {
        console.error('Error fetching notifications for count:', error);
        // Don't reset count on error, keep previous value
      },
    }
  );

  // Backup query for unread notifications count (fallback)
  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery(
    GET_UNREAD_NOTIFICATIONS_COUNT,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      pollInterval: 20000, // Poll less frequently as backup
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'ignore',
      notifyOnNetworkStatusChange: false,
      onError: (error) => {
        console.error('Error fetching unread count (backup):', error);
      },
    }
  );

  // Function to manually refresh unread count
  const refreshUnreadCount = async () => {
    if (user?.id) {
      try {
        // Use the main notifications query to get filtered count
        const { data } = await refetchNotifications();
        if (data?.getUserNotifications) {
          // Filter notifications to only count like, comment, and comment_like types
          const filteredNotifications = data.getUserNotifications.filter(notification => 
            shouldShowRedDot(notification.type)
          );
          
          // Count unread notifications from filtered list
          const unreadFiltered = filteredNotifications.filter(notification => !notification.isRead);
          setUnreadCount(unreadFiltered.length);
          
          console.log('Refreshed filtered notifications count:', {
            total: data.getUserNotifications.length,
            filtered: filteredNotifications.length,
            unreadFiltered: unreadFiltered.length
          });
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error refreshing unread count:', error);
        // Fallback to backup query
        try {
          const { data } = await refetchUnreadCount();
          setUnreadCount(data?.getUnreadNotificationsCount || 0);
        } catch (backupError) {
          console.error('Error with backup unread count:', backupError);
          setUnreadCount(0);
        }
      }
    }
  };

  // Mutation to mark notifications as read
  const [markNotificationsAsReadMutation] = useMutation(MARK_NOTIFICATIONS_AS_READ);

  // Function to mark notifications as read (will be called from NotificationsPage)
  const markAsRead = async () => {
    if (user?.id) {
      try {
        await markNotificationsAsReadMutation({
          variables: { userId: user.id }
        });
        setUnreadCount(0);
        console.log('✅ Notifications marked as read');
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        // Still set to 0 locally for better UX
        setUnreadCount(0);
      }
    }
  };

  // Function to increment unread count (for real-time updates)
  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  // Function to add new notification for popup display
  const addNewNotification = (notification) => {
    // Add timestamp if not present
    const notificationWithTimestamp = {
      ...notification,
      createdAt: notification.createdAt || notification.timestamp || new Date().toISOString()
    };
    
    setNewNotifications(prev => {
      // Prevent duplicates
      const filtered = prev.filter(n => n.id !== notification.id);
      const updated = [...filtered, notificationWithTimestamp];
      return updated;
    });
    
    // Only increment count for like, comment, and comment_like notifications
    if (shouldShowRedDot(notification.type)) {
      incrementUnreadCount();
      console.log('📈 Incremented unread count for notification type:', notification.type);
    }
    
    console.log('✅ Added new notification:', {
      id: notification.id,
      type: notification.type,
      shouldIncrementCount: shouldShowRedDot(notification.type),
      currentUnreadCount: unreadCount + (shouldShowRedDot(notification.type) ? 1 : 0),
      createdAt: notificationWithTimestamp.createdAt
    });
  };

  // Function to remove notification from popup display
  const removeNotification = (notificationId) => {
    setNewNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Function to clear all popup notifications
  const clearAllNotifications = () => {
    setNewNotifications([]);
  };

  const value = {
    unreadCount,
    refreshUnreadCount,
    markAsRead,
    incrementUnreadCount,
    newNotifications,
    addNewNotification,
    removeNotification,
    clearAllNotifications,
    cleanupOldNotifications,
    user,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export { shouldShowRedDot };
export default NotificationContext;