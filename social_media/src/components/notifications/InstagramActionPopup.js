import React, { useEffect, useState } from 'react';
import { FaHeart, FaComment, FaUserPlus } from 'react-icons/fa';

const InstagramActionPopup = ({ type, message, isVisible, onClose, duration = 3000 }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  const getIcon = () => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-white text-lg" />;
      case 'comment':
        return <FaComment className="text-white text-lg" />;
      case 'follow':
        return <FaUserPlus className="text-white text-lg" />;
      default:
        return <FaHeart className="text-white text-lg" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'like':
        return 'bg-red-500';
      case 'comment':
        return 'bg-blue-500';
      case 'follow':
        return 'bg-green-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`
          ${getBackgroundColor()}
          rounded-2xl px-6 py-4 shadow-2xl
          transform transition-all duration-300 ease-out
          ${show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
          flex items-center gap-3
          pointer-events-auto
        `}
        style={{
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Icon with speech bubble effect */}
        <div className="relative">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            {getIcon()}
          </div>
          {/* Small triangle pointer */}
          <div 
            className={`
              absolute -bottom-1 left-1/2 transform -translate-x-1/2
              w-0 h-0 
              ${type === 'like' ? 'border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500' : 
                type === 'comment' ? 'border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-500' : 
                'border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-500'}
            `}
          />
        </div>
        
        {/* Message */}
        <div className="text-white font-medium text-sm">
          {message}
        </div>
      </div>
    </div>
  );
};

export default InstagramActionPopup;