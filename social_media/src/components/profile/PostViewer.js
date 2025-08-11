import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaComment, FaShare, FaBookmark } from 'react-icons/fa';
import { BsThreeDots } from 'react-icons/bs';

const PostViewer = ({ posts, initialIndex = 0, onClose, currentUser }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const modalRef = useRef(null);

  // Sanitize post data to prevent object rendering errors
  const sanitizePost = (post) => {
    if (!post) return null;
    return {
      ...post,
      likes: typeof post.likes === 'number' ? post.likes : (Array.isArray(post.likes) ? post.likes.length : 0),
      user: post.user || { name: 'Unknown User', profileImage: null },
      caption: typeof post.caption === 'string' ? post.caption : '',
      createdAt: post.createdAt || new Date().toISOString()
    };
  };

  // Touch/Swipe handling for mobile navigation
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Double tap to like
  const [lastTap, setLastTap] = useState(0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  const currentPost = sanitizePost(posts[currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'l' || e.key === 'L') {
        // Press 'L' to like
        handleLike();
      } else if (e.key === 's' || e.key === 'S') {
        // Press 'S' to save
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, isLiked, isSaved]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Add API call to like/unlike post
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Add API call to save/unsave post
  };

  const handleComment = () => {
    if (comment.trim()) {
      // TODO: Add API call to post comment
      console.log('Comment:', comment);
      setComment('');
    }
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < posts.length - 1) {
      handleNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      handlePrevious();
    }
  };

  // Double tap to like handler
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      if (!isLiked) {
        setIsLiked(true);
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 1000);
      }
    } else {
      setLastTap(now);
    }
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
      return `${Math.floor(diffInSeconds / 604800)}w`;
    } catch {
      return 'recently';
    }
  };

  // Safety check for posts - after all hooks
  if (!posts || posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p>No posts to display</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-white text-black rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!currentPost) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center animate-fadeIn">
        <div className="flex flex-col items-center justify-center text-white text-base">
          <div className="w-10 h-10 border-3 border-white border-opacity-30 border-t-white rounded-full animate-spin mb-4"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center animate-fadeIn">
      <div 
        className="relative w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-6xl md:max-h-[800px] bg-white md:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        ref={modalRef}
      >
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-xl p-3 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* Navigation Arrows - Hidden on Mobile */}
        {currentIndex > 0 && (
          <button 
            className="hidden md:flex absolute top-1/2 left-5 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-2xl p-4 rounded-full transition-all duration-200 items-center justify-center hover:scale-110 z-10"
            onClick={handlePrevious}
            aria-label="Previous post"
          >
            <FaChevronLeft />
          </button>
        )}
        
        {currentIndex < posts.length - 1 && (
          <button 
            className="hidden md:flex absolute top-1/2 right-5 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-2xl p-4 rounded-full transition-all duration-200 items-center justify-center hover:scale-110 z-10"
            onClick={handleNext}
            aria-label="Next post"
          >
            <FaChevronRight />
          </button>
        )}

        {/* Post Content */}
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Media Section */}
          <div 
            className="flex-1 flex items-center justify-center bg-black relative touch-manipulation min-h-[55vh] md:min-h-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            {currentPost.imageUrl ? (
              <img 
                src={currentPost.imageUrl} 
                alt="Post content"
                className="max-w-full max-h-full object-contain"
              />
            ) : currentPost.videoUrl ? (
              <video 
                src={currentPost.videoUrl}
                controls
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <div className="flex items-center justify-center text-white text-lg">
                <p>No media available</p>
              </div>
            )}
            
            {/* Heart Animation for Double Tap */}
            {showHeartAnimation && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-8xl pointer-events-none z-10 animate-ping">
                <FaHeart className="animate-bounce" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 bg-white flex flex-col border-l-0 md:border-l border-gray-200 border-t md:border-t-0 max-h-[45vh] md:max-h-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img 
                  src={currentPost.user?.profileImage || `https://ui-avatars.com/api/?name=${currentPost.user?.name || 'User'}&background=random`}
                  alt={currentPost.user?.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-gray-800">
                    {currentPost.user?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(currentPost.createdAt)}
                  </span>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
                <BsThreeDots className="text-gray-600" />
              </button>
            </div>

            {/* Caption */}
            {currentPost.caption && (
              <div className="p-4 border-b border-gray-200">
                <span className="font-semibold text-sm text-gray-800">
                  {currentPost.user?.name || 'Unknown User'}
                </span>
                <span className="ml-2 text-sm text-gray-800 leading-relaxed">
                  {currentPost.caption}
                </span>
              </div>
            )}

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 max-h-48 md:max-h-none scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="flex flex-col gap-4">
                {/* Sample comments - replace with real data */}
                <div className="flex gap-3">
                  <img 
                    src="https://ui-avatars.com/api/?name=User&background=random"
                    alt="Commenter"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-gray-800 mr-2">user123</span>
                    <span className="text-sm text-gray-800 leading-relaxed">Great post! 🔥</span>
                  </div>
                </div>
                {/* Add more sample comments for testing scroll */}
                <div className="flex gap-3">
                  <img 
                    src="https://ui-avatars.com/api/?name=Jane&background=random"
                    alt="Commenter"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-gray-800 mr-2">jane_doe</span>
                    <span className="text-sm text-gray-800 leading-relaxed">Amazing shot! 📸✨</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <img 
                    src="https://ui-avatars.com/api/?name=Mike&background=random"
                    alt="Commenter"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-gray-800 mr-2">mike_photo</span>
                    <span className="text-sm text-gray-800 leading-relaxed">Love this! Keep it up 👏</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-4 mb-3">
                <button 
                  className={`text-xl transition-all duration-200 hover:scale-110 p-1 ${isLiked ? 'text-red-500' : 'text-gray-800 hover:text-gray-600'}`}
                  onClick={handleLike}
                >
                  <FaHeart />
                </button>
                <button 
                  className="text-xl text-gray-800 hover:text-gray-600 transition-all duration-200 hover:scale-110 p-1"
                  onClick={() => setShowComments(!showComments)}
                >
                  <FaComment />
                </button>
                <button className="text-xl text-gray-800 hover:text-gray-600 transition-all duration-200 hover:scale-110 p-1">
                  <FaShare />
                </button>
                <button 
                  className={`text-xl transition-all duration-200 hover:scale-110 p-1 ml-auto ${isSaved ? 'text-gray-800' : 'text-gray-800 hover:text-gray-600'}`}
                  onClick={handleSave}
                >
                  <FaBookmark />
                </button>
              </div>

              {/* Likes count */}
              <div className="mb-3">
                <span className="font-semibold text-sm text-gray-800">
                  {currentPost?.likes || 0} likes
                </span>
              </div>

              {/* Comment Input */}
              <div className="flex items-center gap-3 border-t border-gray-200 pt-3">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  className="flex-1 border-none outline-none text-sm text-gray-800 bg-transparent placeholder-gray-500"
                />
                {comment.trim() && (
                  <button 
                    onClick={handleComment}
                    className="text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors duration-200"
                  >
                    Post
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Post Counter - Only on Desktop */}
        <div className="hidden md:block absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-xs font-medium z-10">
          {currentIndex + 1} / {posts.length}
        </div>
      </div>
    </div>
  );
};

export default PostViewer;