import React, { useState, useEffect } from "react";
import { formatDuration } from "../../utils/formatters";
import PostViewer from "./PostViewer";
import MobilePostViewer from "./MobilePostViewer";

export default function ShortsGrid({ shortsVideos, currentUser }) {
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePostClick = (index) => {
    setSelectedPostIndex(index);
    setShowPostViewer(true);
  };

  const handleCloseViewer = () => {
    setShowPostViewer(false);
  };

  // Sanitize videos data for viewer
  const sanitizeVideos = (videosArray) => {
    if (!videosArray || !Array.isArray(videosArray)) return [];
    
    return videosArray.map((item, index) => {
      if (typeof item === 'string') {
        // Handle URL strings
        return {
          id: `video-${index}`,
          videoUrl: item,
          user: currentUser || { name: 'Unknown User', profileImage: null },
          createdAt: new Date().toISOString(),
          likes: 0,
          caption: ''
        };
      } else if (typeof item === 'object' && item !== null) {
        // Handle video objects
        return {
          id: item.id || `video-${index}`,
          imageUrl: item.imageUrl || '',
          videoUrl: item.videoUrl || '',
          user: item.user || currentUser || { name: 'Unknown User', profileImage: null },
          createdAt: item.createdAt || new Date().toISOString(),
          likes: typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likes) ? item.likes.length : 0),
          caption: typeof item.caption === 'string' ? item.caption : ''
        };
      }
      return null;
    }).filter(Boolean);
  };

  // Safety check for videos array - after all hooks
  if (!shortsVideos || !Array.isArray(shortsVideos)) {
    return <div className="text-center py-4">No videos to display</div>;
  }

  // Handle video objects properly
  const isVideoObjects = shortsVideos.length > 0 && typeof shortsVideos[0] === 'object' && shortsVideos[0] !== null;

  return (
    <div className="w-full flex justify-center">
      <div className="grid grid-cols-3 gap-2 xs:gap-3 sm:gap-4 w-full max-w-[26rem]">
        {shortsVideos.map((video, idx) => (
          <div 
            key={idx} 
            className="aspect-square rounded-xl overflow-hidden bg-purple-50 cursor-pointer relative group"
            onClick={() => handlePostClick(idx)}
          >
            <video 
              src={video.videoUrl} 
              poster={video.thumbnailUrl || ""} 
              className="w-full h-full object-cover object-center cursor-pointer" 
              style={{maxWidth:'100%',maxHeight:'100%', minHeight: '60px'}}
              onClick={(e) => e.stopPropagation()} // Prevent triggering post viewer when clicking video controls
            />
            {/* Play Icon and Duration */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="text-white text-[8px] xs:text-[10px] sm:text-xs font-medium">
                {formatDuration(video.duration)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Post Viewer Modal */}
      {showPostViewer && (
        isMobile ? (
          <MobilePostViewer
            posts={sanitizeVideos(shortsVideos)}
            initialIndex={selectedPostIndex}
            onClose={handleCloseViewer}
            currentUser={currentUser}
          />
        ) : (
          <PostViewer
            posts={sanitizeVideos(shortsVideos)}
            initialIndex={selectedPostIndex}
            onClose={handleCloseViewer}
            currentUser={currentUser}
          />
        )
      )}
    </div>
  );
}
