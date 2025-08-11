import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaComment, FaTimes, FaHeart, FaReply } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const CommentPopup = ({ isVisible, commentData, onClose, onLike, onReply }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handleLike = async () => {
    setIsLiked(!isLiked);
    try {
      await onLike(commentData.id, commentData.text, commentData.user?.name);
    } catch (error) {
      console.error('Error liking comment:', error);
      setIsLiked(isLiked); // Revert on error
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      await onReply(commentData.id, replyText);
      setReplyText('');
      setShowReplyInput(false);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10B981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          Reply sent! 💬
        </div>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  const handleViewPost = () => {
    navigate('/', { 
      state: { 
        scrollToPost: commentData.post?.id,
        highlightComment: true,
        commentId: commentData.id 
      } 
    });
    onClose();
  };

  if (!isVisible || !commentData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm"
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Profile Image */}
            <div className="flex-shrink-0 relative">
              <img
                src={commentData.user?.profileImage || `https://ui-avatars.com/api/?name=${commentData.user?.name}&background=random`}
                alt={commentData.user?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <FaComment className="text-white text-xs" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    <span className="font-semibold">{commentData.user?.name}</span> commented on your post
                  </p>
                  
                  {/* Comment Text */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-800">"{commentData.text}"</p>
                  </div>

                  {/* Post Preview */}
                  {commentData.post && (commentData.post.imageUrl || commentData.post.videoUrl) && (
                    <div className="mb-3">
                      <img
                        src={commentData.post.imageUrl || commentData.post.thumbnailUrl}
                        alt="Post preview"
                        className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleViewPost}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <FaHeart className={isLiked ? 'fill-current' : ''} />
                      Like
                    </button>
                    
                    <button
                      onClick={() => setShowReplyInput(!showReplyInput)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <FaReply />
                      Reply
                    </button>
                    
                    <button
                      onClick={handleViewPost}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      View Post
                    </button>
                  </div>

                  {/* Reply Input */}
                  {showReplyInput && (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                        />
                        <button
                          onClick={handleReply}
                          disabled={!replyText.trim()}
                          className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                            replyText.trim()
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(commentData.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
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
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 10, ease: 'linear' }}
              className="bg-blue-500 h-1 rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommentPopup;