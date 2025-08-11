import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaReply, FaTimes } from 'react-icons/fa';

const ReplyNotificationPopup = ({ isVisible, onClose, replyText, replierName, originalCommentText }) => {
  // Auto close after 4 seconds
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
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
            {/* Reply Icon with animation */}
            <motion.div 
              className="flex-shrink-0 bg-purple-100 rounded-full p-2"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.5, 1] }}
            >
              <FaReply className="text-purple-500 text-lg" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    New Reply! 💬
                  </p>
                  
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>{replierName}</strong> replied to your comment
                  </p>

                  {/* Show original comment preview */}
                  {originalCommentText && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2 border-l-2 border-gray-300">
                      <span className="font-medium">Your comment:</span> "{originalCommentText.length > 40 ? originalCommentText.substring(0, 40) + '...' : originalCommentText}"
                    </div>
                  )}

                  {/* Show reply preview */}
                  {replyText && (
                    <div className="text-xs text-gray-700 bg-purple-50 rounded p-2 mb-2 border-l-2 border-purple-300">
                      <span className="font-medium">Reply:</span> "{replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText}"
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Tap to view full conversation
                  </p>
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
            transition={{ duration: 4, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-purple-500 rounded-b-lg"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReplyNotificationPopup;