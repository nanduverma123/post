import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaComment, FaUserPlus, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../../utils/notificationSound';

const InstagramStylePopup = ({ notification, isVisible, onClose, onNavigate }) => {
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
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, notification, onClose]);

  // Get Instagram-style icon and color based on notification type
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'like':
      case 'comment_like':
      case 'reply_like':
        return {
          icon: <FaHeart className="w-5 h-5 text-white" />,
          bgColor: 'from-red-500 to-pink-500',
          iconBg: 'bg-white/20'
        };
      case 'comment':
      case 'reply':
        return {
          icon: <FaComment className="w-5 h-5 text-white" />,
          bgColor: 'from-blue-500 to-purple-500',
          iconBg: 'bg-white/20'
        };
      case 'follow':
        return {
          icon: <FaUserPlus className="w-5 h-5 text-white" />,
          bgColor: 'from-green-500 to-teal-500',
          iconBg: 'bg-white/20'
        };
      default:
        return {
          icon: <FaHeart className="w-5 h-5 text-white" />,
          bgColor: 'from-red-500 to-pink-500',
          iconBg: 'bg-white/20'
        };
    }
  };

  // Get notification text
  const getNotificationText = (type) => {
    switch (type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'comment_like':
        return 'liked your comment';
      case 'reply':
        return 'replied to your comment';
      case 'reply_like':
        return 'liked your reply';
      case 'follow':
        return 'started following you';
      default:
        return 'interacted with your content';
    }
  };

  // Handle click to navigate
  const handleClick = () => {
    if (notification?.type === 'follow') {
      navigate('/profile/' + notification.sender?.id);
    } else if (notification?.post?.id) {
      // Navigate to home page where posts are displayed
      navigate('/', { 
        state: { 
          scrollToPost: notification.post?.id,
          highlightComment: notification.type === 'comment',
          highlightLike: notification.type === 'like'
        } 
      });
    }
    
    onClose();
    if (onNavigate) onNavigate();
  };

  if (!isVisible || !notification) return null;

  const style = getNotificationStyle(notification.type);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={notification?.id || 'notification'}
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.3
          }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] cursor-pointer"
          onClick={handleClick}
        >
          {/* Instagram-style notification bubble - exactly like the image */}
          <div className="relative">
            {/* Main notification bubble */}
            <div className={`bg-gradient-to-br ${style.bgColor} rounded-2xl px-4 py-3 shadow-2xl min-w-[280px] max-w-[320px] relative`}>
              {/* Single icon in center-left */}
              <div className="flex items-center justify-center">
                <div className={`${style.iconBg} rounded-full p-4 shadow-lg`}>
                  {style.icon}
                </div>
              </div>
              
              {/* User info below icon */}
              <div className="mt-3 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <img
                    src={notification.sender?.profileImage || `https://ui-avatars.com/api/?name=${notification.sender?.name}&background=random`}
                    alt={notification.sender?.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white/40"
                  />
                  <div>
                    <p className="text-white text-sm font-bold">
                      {notification.sender?.name}
                    </p>
                  </div>
                </div>
                <p className="text-white/90 text-xs">
                  {getNotificationText(notification.type)}
                </p>
              </div>
              
              {/* Close button - top right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <FaTimes className="text-white text-xs opacity-70" />
              </button>
              
              {/* Progress bar */}
              <div className="mt-3 w-full bg-white/20 rounded-full h-1">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                  className="bg-white h-1 rounded-full"
                />
              </div>
            </div>
            
            {/* Speech bubble tail pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className={`w-0 h-0 border-l-[10px] border-r-[10px] border-t-[8px] border-l-transparent border-r-transparent ${
                notification.type === 'like' ? 'border-t-red-500' :
                notification.type === 'comment' ? 'border-t-blue-500' :
                notification.type === 'follow' ? 'border-t-green-500' :
                'border-t-red-500'
              }`}></div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstagramStylePopup;