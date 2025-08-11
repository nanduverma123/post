import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaComment, FaUserPlus, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../../utils/notificationSound';

const MobileNotificationPopup = ({ notification, isVisible, onClose, onNavigate }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible && notification) {
      // Play notification sound
      playNotificationSound(notification.type);
      
      // Add vibration for mobile
      if ('vibrate' in navigator) {
        let pattern;
        switch (notification.type) {
          case 'like':
            pattern = [100]; // Short vibration
            break;
          case 'comment':
            pattern = [100, 50, 100]; // Double vibration
            break;
          case 'follow':
            pattern = [200]; // Long vibration
            break;
          default:
            pattern = [150];
        }
        navigator.vibrate(pattern);
      }
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, notification, onClose]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-500 text-lg" />;
      case 'comment':
        return <FaComment className="text-blue-500 text-lg" />;
      case 'follow':
        return <FaUserPlus className="text-green-500 text-lg" />;
      default:
        return <FaHeart className="text-gray-500 text-lg" />;
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification?.type) {
      case 'like':
        return `${notification.sender?.name} liked your post`;
      case 'comment':
        return `${notification.sender?.name} commented on your post`;
      case 'follow':
        return `${notification.sender?.name} started following you`;
      case 'comment_like':
        return `${notification.sender?.name} liked your comment`;
      default:
        return notification?.message || 'New notification';
    }
  };

  const handleClick = () => {
    if (notification?.type === 'comment' || notification?.type === 'like') {
      navigate('/', { 
        state: { 
          scrollToPost: notification.post?.id,
          highlightComment: notification.type === 'comment',
          highlightLike: notification.type === 'like'
        } 
      });
    } else if (notification?.type === 'follow') {
      navigate('/profile/' + notification.sender?.id);
    }
    
    onClose();
    if (onNavigate) onNavigate();
  };

  if (!isVisible || !notification) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={notification?.id || 'notification'}
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
          className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-[9999] bg-white rounded-2xl shadow-2xl border-2 border-red-500 p-4 max-w-sm mx-4 cursor-pointer"
          onClick={handleClick}
        >
        <div className="flex items-start space-x-3">
          {/* Profile Image */}
          <img
            src={notification.sender?.profileImage || `https://ui-avatars.com/api/?name=${notification.sender?.name}&background=random`}
            alt={notification.sender?.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
          />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {getNotificationMessage(notification)}
                </p>
                
                {/* Show comment text if it's a comment notification */}
                {notification.type === 'comment' && notification.commentText && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mb-2 line-clamp-2">
                    "{notification.commentText}"
                  </p>
                )}
                
                <p className="text-xs text-gray-500">
                  Just now
                </p>
              </div>
              
              {/* Notification Icon */}
              <div className="ml-2 flex items-center space-x-2">
                {getNotificationIcon(notification.type)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-400 text-xs" />
                </button>
              </div>
            </div>
          </div>
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
        
        {/* Tap to view indicator */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-400">Tap to view</p>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileNotificationPopup;