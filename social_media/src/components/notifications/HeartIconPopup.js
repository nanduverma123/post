import React, { useEffect, useState } from 'react';
import { FaHeart, FaComment, FaUserPlus } from 'react-icons/fa';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';

const HeartIconPopup = ({ heartButtonRef }) => {
  const { popupNotifications, removePopupNotification } = useRealTimeNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    // Show only the latest notification
    if (popupNotifications.length > 0) {
      const latest = popupNotifications[popupNotifications.length - 1];
      setVisibleNotifications([latest]);
      
      // Auto hide after 4 seconds
      const timer = setTimeout(() => {
        setVisibleNotifications([]);
        removePopupNotification(latest.id);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [popupNotifications, removePopupNotification]);

  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-white text-sm" />;
      case 'comment':
        return <FaComment className="text-white text-sm" />;
      case 'comment_like':
        return <FaHeart className="text-white text-sm" />;
      case 'reply_like':
        return <FaHeart className="text-white text-sm" />;
      case 'follow':
        return <FaUserPlus className="text-white text-sm" />;
      default:
        return <FaHeart className="text-white text-sm" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'like':
        return 'bg-red-500';
      case 'comment':
      case 'comment_like':
        return 'bg-blue-500';
      case 'reply_like':
        return 'bg-green-500';
      case 'follow':
        return 'bg-purple-500';
      default:
        return 'bg-red-500';
    }
  };

  const getNotificationMessage = (notification) => {
    const senderName = notification.sender?.name || notification.sender?.username || notification.user || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'comment_like':
        return `${senderName} liked your comment`;
      case 'reply_like':
        return `${senderName} liked your reply`;
      case 'follow':
        return `${senderName} started following you`;
      default:
        return notification.message || 'New notification';
    }
  };

  const getPosition = () => {
    if (!heartButtonRef?.current) return { top: '50%', left: '50%' };
    
    const rect = heartButtonRef.current.getBoundingClientRect();
    return {
      top: rect.top - 80, // Show above the heart button
      left: rect.left + rect.width / 2 - 100, // Center horizontally
    };
  };

  if (visibleNotifications.length === 0) return null;

  const notification = visibleNotifications[0];
  const position = getPosition();

  return (
    <div
      className="fixed z-[10000] pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div
        className={`
          ${getBackgroundColor(notification.type)}
          rounded-2xl px-4 py-3 shadow-2xl
          transform transition-all duration-500 ease-out
          animate-bounce-in
          flex items-center gap-3
          min-w-[240px] max-w-[320px]
        `}
        style={{
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          animation: 'slideInFromBottom 0.5s ease-out',
        }}
      >
        {/* User Avatar - Enhanced */}
        <div className="flex-shrink-0 relative">
          <img
            src={notification.sender?.profileImage || notification.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender?.name || notification.user || 'User')}&background=random&color=fff&size=64`}
            alt={notification.sender?.name || notification.user}
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender?.name || notification.user || 'User')}&background=random&color=fff&size=64`;
            }}
          />
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
        </div>
        
        {/* Content with Icon and Message */}
        <div className="flex-1 flex items-center gap-2">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
              {getIcon(notification.type)}
            </div>
          </div>
          
          {/* Message */}
          <div className="flex-1 text-white text-sm font-medium leading-tight">
            <div className="font-bold">{notification.sender?.name || notification.user}</div>
            <div className="text-xs opacity-90">
              {notification.type === 'like' ? 'liked your post' :
               notification.type === 'comment' ? 'commented on your post' :
               notification.type === 'comment_like' ? 'liked your comment' :
               notification.type === 'reply_like' ? 'liked your reply' :
               notification.type === 'follow' ? 'started following you' :
               'interacted with your content'}
            </div>
          </div>
        </div>

        {/* Triangle pointer pointing to heart icon */}
        <div 
          className={`
            absolute -bottom-2 left-1/2 transform -translate-x-1/2
            w-0 h-0 
            ${notification.type === 'like' ? 'border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500' : 
              (notification.type === 'comment' || notification.type === 'comment_like') ? 'border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-blue-500' : 
              notification.type === 'reply_like' ? 'border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-green-500' :
              'border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-purple-500'}
          `}
        />
      </div>

      <style jsx>{`
        @keyframes slideInFromBottom {
          0% {
            transform: translateY(20px) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HeartIconPopup;