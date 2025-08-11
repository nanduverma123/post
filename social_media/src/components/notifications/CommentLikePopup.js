import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';

const CommentLikePopup = ({ isVisible, onClose, commentText, postOwner }) => {
  // Auto close after 3 seconds
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm mx-4 relative overflow-hidden"
        >
          <div className="flex items-start space-x-3">
            {/* Heart Icon with animation */}
            <motion.div 
              className="flex-shrink-0 bg-red-100 rounded-full p-2"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.5, 1] }}
            >
              <FaHeart className="text-red-500 text-lg" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Comment Liked! ❤️
                  </p>
                  
                  {/* Show comment preview */}
                  {commentText && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-2 line-clamp-2">
                      "{commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText}"
                    </p>
                  )}

                  {/* Show notification info */}
                  {postOwner && (
                    <p className="text-xs text-gray-500">
                      {postOwner} will be notified
                    </p>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors ml-2"
                >
                  <FaTimes className="text-gray-400 text-xs" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 3, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-red-500 rounded-b-lg"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentLikePopup;