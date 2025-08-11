import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaImage } from 'react-icons/fa';

const SharedContent = ({ messageData, onClick }) => {
  const navigate = useNavigate();

  const handleContentClick = () => {
    if (onClick) {
      onClick();
    }

    // Navigate based on content type
    if (messageData.type === 'shared_post') {
      // Navigate to home page where posts are displayed
      navigate('/');
      // You can add scroll to specific post logic here if needed
    } else if (messageData.type === 'shared_reel') {
      // Navigate to reels page
      navigate('/reels');
      // You can add logic to jump to specific reel here if needed
    }
  };

  if (messageData.type === 'shared_post') {
    return (
      <div 
        onClick={handleContentClick}
        className="bg-gray-50 rounded-lg p-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors max-w-xs"
      >
        <div className="flex items-start space-x-3">
          {/* Post Thumbnail */}
          <div className="flex-shrink-0">
            {messageData.postImage ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                <img
                  src={messageData.postImage}
                  alt="Shared post"
                  className="w-full h-full object-cover"
                />
                {messageData.postImage.includes('.mp4') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <FaPlay className="text-white text-lg" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <FaImage className="text-gray-400 text-xl" />
              </div>
            )}
          </div>

          {/* Post Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-1">
              <span className="text-xs font-medium text-purple-600">📝 Shared Post</span>
            </div>
            <p className="text-sm text-gray-800 font-medium mb-1">
              {messageData.postCaption ? 
                (messageData.postCaption.length > 50 ? 
                  `${messageData.postCaption.substring(0, 50)}...` : 
                  messageData.postCaption
                ) : 
                'Shared a post'
              }
            </p>
            <p className="text-xs text-gray-500">
              Shared by {messageData.sharedBy}
            </p>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400">Tap to view post</p>
        </div>
      </div>
    );
  }

  if (messageData.type === 'shared_reel') {
    return (
      <div 
        onClick={handleContentClick}
        className="bg-gray-50 rounded-lg p-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors max-w-xs"
      >
        <div className="flex items-start space-x-3">
          {/* Reel Thumbnail */}
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
              {messageData.reelVideo ? (
                <>
                  <video
                    src={messageData.reelVideo}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <FaPlay className="text-white text-lg" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <FaPlay className="text-gray-400 text-xl" />
                </div>
              )}
            </div>
          </div>

          {/* Reel Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-1">
              <span className="text-xs font-medium text-pink-600">🎬 Shared Reel</span>
            </div>
            <p className="text-sm text-gray-800 font-medium mb-1">
              {messageData.reelTitle ? 
                (messageData.reelTitle.length > 50 ? 
                  `${messageData.reelTitle.substring(0, 50)}...` : 
                  messageData.reelTitle
                ) : 
                'Shared a reel'
              }
            </p>
            <p className="text-xs text-gray-500">
              Shared by {messageData.sharedBy}
            </p>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400">Tap to view reel</p>
        </div>
      </div>
    );
  }

  return null;
};

export default SharedContent;