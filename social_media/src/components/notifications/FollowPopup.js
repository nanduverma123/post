import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserPlus, FaTimes, FaCheck } from 'react-icons/fa';

const FollowPopup = ({ isVisible, followerData, onClose, onFollowBack }) => {
  const [isFollowingBack, setIsFollowingBack] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handleFollowBack = async () => {
    setIsFollowingBack(true);
    try {
      await onFollowBack(followerData.id);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error following back:', error);
      setIsFollowingBack(false);
    }
  };

  if (!isVisible || !followerData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm"
      >
        <div className="flex items-start space-x-3">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <img
              src={followerData.profileImage || `https://ui-avatars.com/api/?name=${followerData.name}&background=random`}
              alt={followerData.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-green-200"
            />
            <div className="absolute -mt-2 -ml-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <FaUserPlus className="text-white text-xs" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  <span className="font-semibold">{followerData.name}</span> started following you
                </p>
                
                <p className="text-xs text-gray-500 mb-3">
                  @{followerData.username || 'user'}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {showSuccess ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <FaCheck className="text-xs" />
                      Following back!
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleFollowBack}
                        disabled={isFollowingBack}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          isFollowingBack
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isFollowingBack ? 'Following...' : 'Follow Back'}
                      </button>
                      <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-full text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
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
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="bg-purple-600 h-1 rounded-full"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FollowPopup;