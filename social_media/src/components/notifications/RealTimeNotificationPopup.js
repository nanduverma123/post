import React, { useState, useEffect } from 'react';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaComment, FaUserPlus, FaTimes, FaShare } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const RealTimeNotificationPopup = () => {
  const [show, setShow] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  // Get real-time notifications
  const { popupNotifications } = useRealTimeNotifications();

  // Handle real-time notifications from socket
  useEffect(() => {
    if (popupNotifications && popupNotifications.length > 0) {
      const latestNotification = popupNotifications[popupNotifications.length - 1];
      
      // Skip test notifications
      if (latestNotification.id && latestNotification.id.startsWith('test-')) {
        return;
      }
      
      let message, user, avatar;
      
      if (latestNotification.type === 'share') {
        // Handle share notifications differently
        message = latestNotification.message;
        user = latestNotification.senderName;
        avatar = latestNotification.senderProfileImage;
      } else {
        // Handle regular notifications
        message = `${latestNotification.sender?.name || 'Someone'} ${
          latestNotification.type === 'like' ? 'liked your post!' :
          latestNotification.type === 'comment' ? 'commented on your post!' :
          latestNotification.type === 'comment_like' ? 'liked your comment!' :
          latestNotification.type === 'reply' ? 'replied to your comment!' :
          latestNotification.type === 'reply_like' ? 'liked your reply!' :
          latestNotification.type === 'follow' ? 'started following you!' :
          'sent you a notification!'
        }`;
        user = latestNotification.sender?.name || 'Someone';
        avatar = latestNotification.sender?.profileImage;
      }
      
      setNotificationData({
        type: latestNotification.type,
        message: message,
        user: user,
        avatar: avatar,
        commentText: latestNotification.commentText,
        contentType: latestNotification.contentType
      });
      
      setShow(true);
      
      // Play notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio fails
      } catch (error) {
        // Ignore audio errors
      }

      // Vibrate on mobile devices
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Short vibration pattern
      }
      
      // Hide after 8 seconds (pause on hover)
      const timeoutId = setTimeout(() => {
        if (!isHovered) {
          setShow(false);
        }
      }, 8000);

      return () => clearTimeout(timeoutId);
    }
  }, [popupNotifications, isHovered]);

  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-400" />;
      case 'comment':
        return <FaComment className="text-blue-400" />;
      case 'comment_like':
        return <FaHeart className="text-red-400" />;
      case 'reply':
        return <FaComment className="text-green-400" />;
      case 'reply_like':
        return <FaHeart className="text-purple-400" />;
      case 'follow':
        return <FaUserPlus className="text-green-400" />;
      case 'share':
        return <FaShare className="text-blue-400" />;
      default:
        return <FaHeart className="text-gray-400" />;
    }
  };

  const getGradient = (type) => {
    switch (type) {
      case 'like':
        return 'from-red-500 to-pink-500';
      case 'comment':
        return 'from-blue-500 to-cyan-500';
      case 'comment_like':
        return 'from-red-500 to-pink-500';
      case 'reply':
        return 'from-green-500 to-emerald-500';
      case 'reply_like':
        return 'from-purple-500 to-pink-500';
      case 'follow':
        return 'from-green-500 to-emerald-500';
      case 'share':
        return 'from-blue-500 to-purple-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  const handleNotificationClick = () => {
    setShow(false);
    // Navigate based on notification type
    if (notificationData.type === 'follow') {
      navigate('/notifications');
    } else {
      // For likes and comments, go to notifications page
      navigate('/notifications');
    }
  };

  return (
    <AnimatePresence>
      {show && notificationData && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.3, 
            y: 50,
            x: 20
          }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: 0
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8, 
            y: 20,
            x: 20
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            mass: 1
          }}
          className={`fixed bottom-32 right-4 bg-gradient-to-r ${getGradient(notificationData.type)} text-white p-4 rounded-2xl shadow-2xl z-[9999] max-w-sm cursor-pointer transform-gpu`}
          style={{
            transformOrigin: 'bottom right'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleNotificationClick}
          whileHover={{ 
            scale: 1.05,
            y: -5,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Animated Arrow pointing to heart */}
          <motion.div 
            className={`absolute -bottom-2 right-8 w-4 h-4 bg-gradient-to-r ${getGradient(notificationData.type)} transform rotate-45 shadow-lg`}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 45 }}
            transition={{ delay: 0.1, type: "spring" }}
          />
          
          {/* Progress Bar */}
          <motion.div
            className="absolute top-0 left-0 h-1 bg-white bg-opacity-30 rounded-t-2xl"
            initial={{ width: "100%" }}
            animate={{ width: isHovered ? "100%" : "0%" }}
            transition={{ duration: isHovered ? 0 : 8, ease: "linear" }}
          />

          <div className="flex items-start space-x-3 relative">
            {/* Animated Avatar */}
            <motion.div 
              className="flex-shrink-0 relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              {notificationData.avatar ? (
                <div className="relative">
                  <img
                    src={notificationData.avatar}
                    alt={notificationData.user}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                  {/* Icon overlay */}
                  <motion.div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {getIcon(notificationData.type)}
                  </motion.div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl border-2 border-white">
                  {getIcon(notificationData.type)}
                </div>
              )}
            </motion.div>

            {/* Content */}
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm font-semibold text-white leading-tight mb-1">
                {notificationData.message}
              </p>
              
              {/* Comment/Reply text if available */}
              {(notificationData.type === 'comment' || notificationData.type === 'reply') && notificationData.commentText && (
                <motion.p 
                  className="text-xs text-white text-opacity-80 bg-white bg-opacity-10 rounded-lg px-2 py-1 mb-1 italic"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.5 }}
                >
                  "{notificationData.commentText}"
                </motion.p>
              )}
              
              <motion.p 
                className="text-xs text-white text-opacity-70 flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-white bg-opacity-60 rounded-full mr-2"
                />
                Just now
              </motion.p>
            </motion.div>

            {/* Interactive Close Button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="flex-shrink-0 text-white text-opacity-60 hover:text-opacity-100 transition-all duration-200 p-1 rounded-full hover:bg-white hover:bg-opacity-20"
              whileHover={{ scale: 1.2, rotate: 90 }}
              whileTap={{ scale: 0.8 }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.7 }}
            >
              <FaTimes className="w-3 h-3" />
            </motion.button>
          </div>

          {/* Floating particles effect */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60"
              style={{
                top: `${20 + i * 15}%`,
                right: `${10 + i * 5}%`,
              }}
              animate={{
                y: [-10, -20, -10],
                opacity: [0.6, 0.2, 0.6],
              }}
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RealTimeNotificationPopup;