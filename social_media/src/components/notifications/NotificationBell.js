import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaHeart, FaComment, FaUserPlus, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    newNotifications,
    removeNotification 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showNewNotificationPopup, setShowNewNotificationPopup] = useState(null);
  const bellRef = useRef(null);
  const navigate = useNavigate();

  // Show popup for new notifications
  useEffect(() => {
    if (newNotifications.length > 0) {
      const latestNotification = newNotifications[newNotifications.length - 1];
      setShowNewNotificationPopup(latestNotification);
      
      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
        setShowNewNotificationPopup(null);
        removeNotification(latestNotification.id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [newNotifications, removeNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-blue-500" />;
      case 'follow':
        return <FaUserPlus className="text-green-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'like':
        return `${notification.sender?.name} liked your post`;
      case 'comment':
        return `${notification.sender?.name} commented on your post`;
      case 'follow':
        return `${notification.sender?.name} started following you`;
      case 'comment_like':
        return `${notification.sender?.name} liked your comment`;
      default:
        return notification.message || 'New notification';
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'comment' || notification.type === 'like') {
      navigate('/', { 
        state: { 
          scrollToPost: notification.post?.id,
          highlightComment: notification.type === 'comment',
          highlightLike: notification.type === 'like'
        } 
      });
    } else if (notification.type === 'follow') {
      navigate('/profile/' + notification.sender?.id);
    }
    
    setIsOpen(false);
  };

  const handlePopupClick = () => {
    if (showNewNotificationPopup) {
      handleNotificationClick(showNewNotificationPopup);
      setShowNewNotificationPopup(null);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative" ref={bellRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <FaBell className="text-xl" />
        
        {/* Red dot for unread notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* New Notification Popup */}
      <AnimatePresence>
        {showNewNotificationPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-12 right-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-80 cursor-pointer"
            onClick={handlePopupClick}
          >
            <div className="flex items-start space-x-3">
              {/* Profile Image */}
              <img
                src={showNewNotificationPopup.sender?.profileImage || `https://ui-avatars.com/api/?name=${showNewNotificationPopup.sender?.name}&background=random`}
                alt={showNewNotificationPopup.sender?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {getNotificationMessage(showNewNotificationPopup)}
                    </p>
                    
                    {/* Show comment text if it's a comment notification */}
                    {showNewNotificationPopup.type === 'comment' && showNewNotificationPopup.commentText && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2">
                        "{showNewNotificationPopup.commentText}"
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {formatTime(showNewNotificationPopup.createdAt)}
                    </p>
                  </div>
                  
                  {/* Notification Icon */}
                  <div className="ml-2">
                    {getNotificationIcon(showNewNotificationPopup.type)}
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewNotificationPopup(null);
                  removeNotification(showNewNotificationPopup.id);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-400 text-xs" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="bg-purple-600 h-1 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-0 z-40 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <FaBell className="text-gray-300 text-3xl mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={notification.sender?.profileImage || `https://ui-avatars.com/api/?name=${notification.sender?.name}&background=random`}
                        alt={notification.sender?.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 mb-1">
                          {getNotificationMessage(notification)}
                        </p>
                        
                        {notification.type === 'comment' && notification.commentText && (
                          <p className="text-xs text-gray-600 bg-gray-100 p-1 rounded mb-1 truncate">
                            "{notification.commentText}"
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getNotificationIcon(notification.type)}
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;