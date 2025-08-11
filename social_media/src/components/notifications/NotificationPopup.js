import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaComment, FaUserPlus, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NotificationPopup = ({ notifications, onClose, onNotificationClick }) => {
  const navigate = useNavigate();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-blue-500" />;
      case 'follow':
        return <FaUserPlus className="text-green-500" />;
      default:
        return <FaHeart className="text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification) => {
    const senderName = notification.sender?.name || notification.sender?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'comment_like':
        return `${senderName} liked your comment`;
      case 'follow':
        return `${senderName} started following you`;
      default:
        return notification.message || 'New notification';
    }
  };

  const handleNotificationClick = (notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Navigate based on notification type with better targeting
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.sender.id}`);
    } else if (notification.type === 'comment' && notification.post) {
      // Navigate to home and scroll to specific post
      navigate('/', { 
        state: { 
          scrollToPost: notification.post.id,
          highlightComment: true,
          commentId: notification.commentId 
        } 
      });
    } else if (notification.type === 'like' && notification.post) {
      // Navigate to home and scroll to specific post
      navigate('/', { 
        state: { 
          scrollToPost: notification.post.id,
          highlightLike: true 
        } 
      });
    } else if (notification.type === 'comment_like') {
      // Navigate to home and scroll to specific comment
      navigate('/', { 
        state: { 
          scrollToPost: notification.post?.id,
          highlightComment: true,
          commentId: notification.commentId 
        } 
      });
    }
  };

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              delay: index * 0.1 
            }}
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-3">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <img
                  src={notification.sender?.profileImage || `https://ui-avatars.com/api/?name=${notification.sender?.name || 'User'}&background=random`}
                  alt={notification.sender?.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {getNotificationMessage(notification)}
                    </p>
                    
                    {/* Show comment text if available */}
                    {notification.type === 'comment' && notification.commentText && (
                      <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-2">
                        "{notification.commentText}"
                      </p>
                    )}

                    {/* Show post preview if available */}
                    {notification.post && (notification.post.imageUrl || notification.post.videoUrl) && (
                      <div className="mt-2">
                        <img
                          src={notification.post.imageUrl || notification.post.thumbnailUrl}
                          alt="Post preview"
                          className="w-12 h-12 rounded object-cover"
                        />
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>

                  {/* Notification Icon */}
                  <div className="flex-shrink-0 ml-2">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(notification.id);
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-400 text-xs" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPopup;