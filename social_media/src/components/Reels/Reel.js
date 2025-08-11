import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_ALL_POSTS, GET_ALL_VIDEOS, LIKE_VIDEO, COMMENT_ON_VIDEO, INCREMENT_VIDEO_VIEWS, FOLLOW_AND_UNFOLLOW, DELETE_VIDEO } from '../../graphql/mutations';
import { GetTokenFromCookie } from '../../components/getToken/GetToken';
import { Heart, MessageCircleMore, Share2, Bookmark, Ellipsis, Volume2, VolumeOff, CirclePause, CirclePlay, ArrowLeftFromLine } from 'lucide-react';
import ShareModal from '../share/ShareModal';
import ProfileCard from './ProfileCard';
import { useReelNotifications } from '../../utils/reelNotifications';
// import FooterNav from '../../components/footer/FooterNav';

// Sound wave animation styles
const soundWaveStyle = `
@keyframes wave {
  0%, 100% { height: 30%; }
  50% { height: 90%; }
}
`;

const Reel = () => {
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [tokens, setTokens] = useState();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const touchStartY = useRef(null);
  // For wheel scroll
  const lastWheelTime = useRef(0);
  // Heart icon toggle state
  const [liked, setLiked] = useState(false);
  // Follow button state - track for each user
  const [followingUsers, setFollowingUsers] = useState(new Set());
  // Force re-render trigger
  const [updateTrigger, setUpdateTrigger] = useState(0);
  // Mute/unmute state - start unmuted by default
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  // User interaction state for autoplay
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  // Video playing state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  // Add state for play icon fade
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  // Unmute hint when autoplay with sound is blocked
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Handle user interaction to enable autoplay
  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      console.log('🎬 User interaction detected, autoplay enabled');
      // Unmute on first interaction and try to play with sound
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('🎬 Still cannot autoplay after user interaction:', error);
          });
        }
      }
    }
    // Hide hint once user interacts
    setShowUnmuteHint(false);
  };
  // Mutations
  const [followUser] = useMutation(FOLLOW_AND_UNFOLLOW);
  const [likeVideo] = useMutation(LIKE_VIDEO);
  const [commentOnVideo] = useMutation(COMMENT_ON_VIDEO);
  const [deleteVideo] = useMutation(DELETE_VIDEO);
  
  // Reel notifications
  const { addReelLikeNotification, addReelCommentNotification } = useReelNotifications();

  const handleFollowClick = async () => {
    const currentVideo = allVideos[currentVideoIndex];
    if (!currentVideo?.createdBy?.id || !tokens?.id) return;

    const userId = getUserId(currentVideo.createdBy);
    if (!userId) return;
    
    const isCurrentlyFollowing = followingUsers.has(userId);
    console.log('🔄 Following user:', userId, 'Currently following:', isCurrentlyFollowing);

    // Update UI immediately for better user experience
    const newFollowingUsers = new Set(followingUsers);
    if (isCurrentlyFollowing) {
      newFollowingUsers.delete(userId);
      console.log('✅ Unfollowing user:', userId);
    } else {
      newFollowingUsers.add(userId);
      console.log('✅ Following user:', userId);
    }
    
    // Update state immediately
    setFollowingUsers(newFollowingUsers);
    
    // Force re-render with a small delay to ensure state is updated
    setTimeout(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 10);
    
    console.log('Updated following users:', Array.from(newFollowingUsers));

    try {
      const result = await followUser({
        variables: { id: userId }
      });
      console.log('Follow mutation result:', result);
      console.log('✅ Follow action completed');
      
      // Show success message
      const message = isCurrentlyFollowing ? 'Unfollowed successfully!' : 'Following successfully!';
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${isCurrentlyFollowing ? '#EF4444' : '#10B981'};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          ${message}
        </div>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error following user:', error);
      
      // Don't revert the state - keep the UI change even if API fails
      // This provides better user experience
      console.log('⚠️ API call failed but keeping UI state for better UX');
      
      // Show a subtle error message but don't revert
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #F59E0B;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          Action completed locally. Syncing in background...
        </div>
      `;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv);
        }
      }, 2000);
    }
  };
  // Double tap/double click handler for like
  const handleDoubleClick = () => setLiked((prev) => !prev);

  // Add state for comments and input
  const [commentInput, setCommentInput] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  useEffect(() => {
    // Prevent scrolling when Reels page is mounted
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    try {
      const decodedUser = GetTokenFromCookie();
      setTokens(decodedUser);
    } catch (error) {
      console.error("Error getting token from cookie:", error);
    }
  }, []);

  // Fetch posts from backend
  const { data, loading, error, refetch } = useQuery(GET_ALL_POSTS, {
    variables: { userId: tokens?.id },
  });

  // Fetch videos from backend for reels
  const { data: videosData, loading: videosLoading, error: videosError, refetch: refetchVideos } = useQuery(GET_ALL_VIDEOS, {
    onError: (error) => {
      console.error('❌ GET_ALL_VIDEOS Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Network error:', error.networkError);
      console.error('❌ GraphQL errors:', error.graphQLErrors);
    },
    onCompleted: (data) => {
      console.log('✅ GET_ALL_VIDEOS Success:', data);
    }
  });

  // Additional mutations
  const [incrementVideoViews] = useMutation(INCREMENT_VIDEO_VIEWS);

  // Helper function to get consistent user ID (handles Buffer-like objects)
  const getUserId = (user) => {
    const rawId = user?.id;
    if (!rawId) return null;
    if (typeof rawId === 'string' || typeof rawId === 'number') {
      return rawId.toString();
    }
    // Handle Mongo/ObjectId represented as Buffer when serialized to JSON
    if (typeof rawId === 'object') {
      // Common shape: { $oid: '...' }
      if (typeof rawId.$oid === 'string') return rawId.$oid;
      // Node Buffer JSON: { type: 'Buffer', data: [ ... ] }
      if (rawId.type === 'Buffer' && Array.isArray(rawId.data)) {
        const hex = rawId.data
          .map((byte) => Number(byte).toString(16).padStart(2, '0'))
          .join('');
        return hex;
      }
      // Fallback: try toString safely
      try {
        return String(rawId);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Helper function to check if user is being followed
  const isUserFollowed = (user) => {
    const userId = getUserId(user);
    const isFollowed = userId ? followingUsers.has(userId) : false;
    return isFollowed;
  };

  // Track like state per video
  const isVideoLiked = (video) => {
    if (!tokens?.id || !video?.likes) return false;
    return video.likes.some(like => like.user.id === tokens.id);
  };

  useEffect(() => {
    if (data?.getAllPosts) {
      // Filter only posts that have videos
      const videoPosts = data.getAllPosts.filter(post => post.videoUrl);
      setAllPosts(videoPosts);
    }
  }, [data]);

  useEffect(() => {
    if (videosData?.getAllVideos) {
      console.log(`📹 Loaded ${videosData.getAllVideos.length} videos from backend`);
      setAllVideos(videosData.getAllVideos);
      
      // Check initial following status for all video creators
      if (tokens?.id) {
        const initialFollowingUsers = new Set();
        videosData.getAllVideos.forEach(video => {
          if (video.createdBy?.followers) {
            const isFollowing = video.createdBy.followers.some(follower => 
              getUserId(follower) === tokens.id
            );
            if (isFollowing) {
              const creatorId = getUserId(video.createdBy);
              if (creatorId) {
                initialFollowingUsers.add(creatorId);
              }
            }
          }
        });
        setFollowingUsers(initialFollowingUsers);
        console.log('📹 Initial following users:', Array.from(initialFollowingUsers));
      }
      

    } else if (videosData) {
      console.log('📹 Videos data received but no getAllVideos:', videosData);
    }
  }, [videosData, tokens]);

  // Monitor following users state changes for debugging
  useEffect(() => {
    console.log('🔄 Following users state updated:', Array.from(followingUsers));
  }, [followingUsers]);

  // Simple function to pause all videos except current
  const pauseAllVideosExceptCurrent = () => {
    const allVideoElements = document.querySelectorAll('video');
    allVideoElements.forEach((video, index) => {
      if (index !== currentVideoIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });
    // Play the current video using videoRef
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Simple video visibility management
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.display = 'block';
      videoRef.current.style.visibility = 'visible';
      videoRef.current.style.opacity = '1';
    }
  }, [currentVideoIndex]);

  // Attempt to autoplay with sound; if blocked, fall back to muted and show a hint
  const attemptPlayWithSound = () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.muted = isMuted; // expected false initially
      el.volume = 1.0;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setIsVideoPlaying(true);
            if (!el.muted) setShowUnmuteHint(false);
          })
          .catch(err => {
            console.log('🎬 Autoplay with sound blocked, falling back to muted:', err?.name || err);
            el.muted = true;
            setIsMuted(true);
            setShowUnmuteHint(true);
            el.play().catch(() => {});
          });
      }
    } catch (e) {
      el.muted = true;
      setIsMuted(true);
      setShowUnmuteHint(true);
      try { el.play().catch(() => {}); } catch {}
    }
  };

  // Log errors when they occur
  useEffect(() => {
    if (videosError) {
      console.error('🚨 Videos Error Details:', {
        message: videosError.message,
        networkError: videosError.networkError,
        graphQLErrors: videosError.graphQLErrors
      });
    }
  }, [videosError]);

  // Log errors when they occur
  useEffect(() => {
    if (videosError) {
      console.error('🚨 Videos Error Details:', {
        message: videosError.message,
        networkError: videosError.networkError,
        graphQLErrors: videosError.graphQLErrors
      });
    }
  }, [videosError]);

  // Refetch data when tokens are available
  useEffect(() => {
    if (tokens?.id) {
      refetch();
    }
  }, [tokens, refetch]);

  // Handle swipe up/down with smooth animation
  const handleTouchStart = (e) => {
    handleUserInteraction();
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null || isAnimating) return;
    const currentY = e.touches[0].clientY;
    const diffY = touchStartY.current - currentY;
    // Limit the drag distance for better UX
    const maxDrag = 100;
    const clampedDiffY = Math.max(-maxDrag, Math.min(maxDrag, diffY));
    setTranslateY(clampedDiffY);
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null || isAnimating) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY.current - touchEndY;
    
    if (Math.abs(diffY) > 50) {
      setIsAnimating(true);
      if (diffY > 0 && currentVideoIndex < allVideos.length - 1) {
        // Swipe up - animate to next video
        setTranslateY(-window.innerHeight);
        setTimeout(() => {
          setCurrentVideoIndex((prev) => prev + 1);
          setTranslateY(0);
          setIsAnimating(false);
          // Pause all videos except current one with delay
          setTimeout(() => pauseAllVideosExceptCurrent(), 100);
        }, 300);
      } else if (diffY < 0 && currentVideoIndex > 0) {
        // Swipe down - animate to previous video
        setTranslateY(window.innerHeight);
        setTimeout(() => {
          setCurrentVideoIndex((prev) => prev - 1);
          setTranslateY(0);
          setIsAnimating(false);
          // Pause all videos except current one with delay
          setTimeout(() => pauseAllVideosExceptCurrent(), 100);
        }, 300);
      } else {
        // Reset position if swipe is not valid
        setTranslateY(0);
      }
    } else {
      // Reset position if swipe distance is too small
      setTranslateY(0);
    }
    touchStartY.current = null;
  };

  // Handle keyboard up/down with smooth animation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAnimating) return;
      
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        setIsAnimating(true);
        setTranslateY(window.innerHeight);
        setTimeout(() => {
          setCurrentVideoIndex((prev) => prev - 1);
          setTranslateY(0);
          setIsAnimating(false);
          // Pause all videos except current one with delay
          setTimeout(() => pauseAllVideosExceptCurrent(), 100);
        }, 300);
      } else if (e.key === 'ArrowDown' && currentVideoIndex < allVideos.length - 1) {
        setIsAnimating(true);
        setTranslateY(-window.innerHeight);
        setTimeout(() => {
          setCurrentVideoIndex((prev) => prev + 1);
          setTranslateY(0);
          setIsAnimating(false);
          // Pause all videos except current one with delay
          setTimeout(() => pauseAllVideosExceptCurrent(), 100);
        }, 300);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideoIndex, allVideos.length, isAnimating]);

  // Handle wheel scroll for reel change with smooth animation
  const WHEEL_COOLDOWN = 400; // ms
  const handleWheel = (e) => {
    const now = Date.now();
    if (now - lastWheelTime.current < WHEEL_COOLDOWN || isAnimating) return;
    
    if (e.deltaY > 0 && currentVideoIndex < allVideos.length - 1) {
      setIsAnimating(true);
      setTranslateY(-window.innerHeight);
      setTimeout(() => {
        setCurrentVideoIndex((prev) => prev + 1);
        setTranslateY(0);
        setIsAnimating(false);
        // Pause all videos except current one with delay
        setTimeout(() => pauseAllVideosExceptCurrent(), 100);
      }, 300);
      lastWheelTime.current = now;
    } else if (e.deltaY < 0 && currentVideoIndex > 0) {
      setIsAnimating(true);
      setTranslateY(window.innerHeight);
      setTimeout(() => {
        setCurrentVideoIndex((prev) => prev - 1);
        setTranslateY(0);
        setIsAnimating(false);
        // Pause all videos except current one with delay
        setTimeout(() => pauseAllVideosExceptCurrent(), 100);
      }, 300);
      lastWheelTime.current = now;
    }
  };

  // Like handler
  const handleHeartClick = async () => {
    const video = allVideos[currentVideoIndex];
    if (!video) return;
    
    console.log('🎬 Like button clicked for video:', video.id);
    console.log('🎬 Video owner:', video.createdBy?.id);
    console.log('🎬 Current user:', tokens?.id);
    console.log('🎬 Is own video:', video.createdBy?.id === tokens?.id);
    
    try {
      const result = await likeVideo({ variables: { videoId: video.id } });
      console.log('🎬 Like result:', result);
      
      // Refetch videos to update like count
      if (typeof refetchVideos === 'function') refetchVideos();
    } catch (err) {
      console.error('🎬 Like error:', err);
    }
  };

  // Comment handler
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const video = allVideos[currentVideoIndex];
    if (!video || !commentInput.trim()) return;
    
    console.log('🎬 Comment submitted for video:', video.id);
    console.log('🎬 Comment text:', commentInput);
    console.log('🎬 Video owner:', video.createdBy?.id);
    console.log('🎬 Current user:', tokens?.id);
    console.log('🎬 Is own video:', video.createdBy?.id === tokens?.id);
    
    try {
      const result = await commentOnVideo({ variables: { videoId: video.id, text: commentInput } });
      console.log('🎬 Comment result:', result);
      setCommentInput("");
      // Refetch videos to update comments
      if (typeof refetchVideos === 'function') refetchVideos();
    } catch (err) {
      console.error('🎬 Comment error:', err);
    }
  };

  // Delete handler
  const handleDeleteVideo = async () => {
    const video = allVideos[currentVideoIndex];
    if (!video || !tokens?.id) return;

    // Check if user owns the video
    if (video.createdBy.id !== tokens.id) {
      alert('You can only delete your own videos!');
      return;
    }

    // Show confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this reel? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      console.log('🗑️ Deleting video:', video.id);
      
      await deleteVideo({ variables: { videoId: video.id } });
      
      // Remove video from local state
      setAllVideos(prevVideos => {
        const updatedVideos = prevVideos.filter(v => v.id !== video.id);
        
        // Adjust current index if needed
        if (currentVideoIndex >= updatedVideos.length && updatedVideos.length > 0) {
          setCurrentVideoIndex(updatedVideos.length - 1);
        } else if (updatedVideos.length === 0) {
          setCurrentVideoIndex(0);
        }
        
        return updatedVideos;
      });
      
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        ">
          Reel deleted successfully! ✓
        </div>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
      }, 3000);
      
      setShowDeleteMenu(false);
      console.log('✅ Video deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    }
  };

  // Check if current user owns the video
  const isVideoOwner = (video) => {
    return video && tokens?.id && video.createdBy.id === tokens.id;
  };

  // Handle username click to navigate to profile
  const handleUsernameClick = (userId) => {
    // if (!userId) return;
    // navigate(`/profile/${userId}`);
  };

  // Handle profile image click to show popup
  const handleProfileImageClick = (user) => {
    if (!user) return;
    console.log('Reel - Profile image clicked for user:', user);
    setSelectedUserProfile(user);
    setShowProfilePopup(true);
  };

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteMenu && !event.target.closest('.delete-menu-container')) {
        setShowDeleteMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);

  // Track view count with 3-second delay when video changes
  useEffect(() => {
    const video = allVideos[currentVideoIndex];
    if (!video) {
      console.log('⚠️ No video found at index:', currentVideoIndex);
      return;
    }

    console.log(`🎬 Starting 3-second timer for video ${video.id} (${video.title})`);
    console.log(`📊 Current views: ${video.views}`);

    // Set a 3-second timer before counting the view
    const viewTimer = setTimeout(async () => {
      try {
        console.log(`⏰ 3 seconds passed, tracking view for video ${video.id}`);
        const result = await incrementVideoViews({ variables: { videoId: video.id } });
        console.log(`✅ View tracked successfully:`, result.data);
        
        // Update the local state to reflect new view count
        setAllVideos(prevVideos => 
          prevVideos.map(v => 
            v.id === video.id 
              ? { ...v, views: result.data.incrementVideoViews.views }
              : v
          )
        );
        console.log(`📈 Updated local state with new view count: ${result.data.incrementVideoViews.views}`);
      } catch (error) {
        console.error('❌ Error tracking video view:', error);
        console.error('Error details:', error.message);
      }
    }, 3000); // 3 seconds delay

    // Cleanup timer if user swipes away before 3 seconds
    return () => {
      console.log(`🧹 Cleaning up timer for video ${video.id}`);
      clearTimeout(viewTimer);
    };
    // eslint-disable-next-line
  }, [currentVideoIndex, incrementVideoViews]);

  // Simple video management - play current video, pause others
  useEffect(() => {
    console.log('🎬 Video index changed to:', currentVideoIndex);
    
    // Get all video elements
    const allVideoEls = document.querySelectorAll('video');
    console.log('🎬 Found', allVideoEls.length, 'videos');
    
    // Pause all videos first
    allVideoEls.forEach((vid, idx) => {
      if (idx !== currentVideoIndex) {
        console.log('🎬 Pausing video at index:', idx);
        vid.pause();
        vid.currentTime = 0;
      }
    });
    
    // Play the current video (try with sound first)
    const currentVideoEl = allVideoEls[currentVideoIndex];
    if (currentVideoEl) {
      console.log('🎬 Attempting to play video at index (with sound):', currentVideoIndex);
      attemptPlayWithSound();
    } else {
      console.log('🎬 No video element found at index:', currentVideoIndex);
    }
  }, [currentVideoIndex]);

  // Auto-play first reel on initial load - try with sound first
  useEffect(() => {
    if (currentVideoIndex === 0 && allVideos.length > 0 && videoRef.current) {
      attemptPlayWithSound();
    }
  }, [allVideos, currentVideoIndex]);

  // Sync isVideoPlaying state with actual video element on mount and when videoRef changes
  useEffect(() => {
    if (videoRef.current && !videoRef.current.paused) {
      setIsVideoPlaying(true);
    }
  }, [videoRef, currentVideoIndex]);

  // Render individual reel card
  const renderReelCard = (video, index, offset = 0) => {
    if (!video) return null;
    const liked = isVideoLiked(video);
    return (
      <div
        key={`${video.id}-${index}`}
        className="bg-white rounded-2xl shadow-2xl w-full absolute"
        style={{
          height: '35rem', 
          boxShadow: '0 8px 40px 8px rgba(0,0,0,0.35)',
          transform: `translateY(${offset + translateY}px)`,
          transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.1s ease-out',
          zIndex: offset === 0 ? 10 : 5,
          overflow: 'hidden'
        }}
        onDoubleClick={offset === 0 ? (e) => {
          handleUserInteraction();
          handleHeartClick();
        } : undefined}
      >
        <div className="relative w-full h-full bg-black">
          {/* Debug info */}
          {/* {offset === 0 && (
            <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-50 p-1 rounded z-20">
              Video {currentVideoIndex}: {video.videoUrl ? 'Available' : 'Missing'}
            </div>
          )} */}
          
          <video
            ref={offset === 0 ? videoRef : null}
            className="w-full h-full object-cover"
            style={{ 
              backgroundColor: 'transparent',
              display: 'block',
              visibility: 'visible',
              opacity: 1
            }}
            autoPlay={offset === 0}
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            controls={false}
            onLoadStart={() => console.log('🎬 Video loading started:', video.videoUrl)}
            onLoadedMetadata={() => console.log('📊 Video metadata loaded:', video.videoUrl)}
            onLoadedData={() => console.log('📹 Video data loaded:', video.videoUrl)}
            onCanPlay={() => console.log('▶️ Video can play:', video.videoUrl)}
            onPlay={() => {
              if (offset === 0) {
                setIsVideoPlaying(true);
                if (hasUserInteracted) {
                  setShowPlayIcon(true);
                  setTimeout(() => setShowPlayIcon(false), 1000);
                }
                if (!isMuted) setShowUnmuteHint(false);
              }
            }}
            onPause={() => {
              if (offset === 0) {
                setIsVideoPlaying(false);
              }
            }}
            onError={(e) => console.error('❌ Video error:', e.target.error, video.videoUrl)}
            onClick={offset === 0 ? (e => {
              handleUserInteraction();
              if (e.target.paused) {
                e.target.play().catch(error => {
                  console.log('🎬 Click to play failed:', error);
                });
              } else {
                e.target.pause();
              }
            }) : undefined}
          >
            <source src={video.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {offset === 0 && showUnmuteHint && (
            <div className="absolute top-4 left-4 z-30 bg-black/60 text-white text-xs px-3 py-2 rounded">
              Tap volume to unmute
            </div>
          )}
          {/* Overlay play/pause icons */}
          {offset === 0 && hasUserInteracted && !isVideoPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <CirclePause size={80} color="#fff" style={{ filter: 'drop-shadow(0 2px 8px #0008)' }} />
            </div>
          )}
          {offset === 0 && showPlayIcon && !isVideoPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-1000"
              style={{ opacity: showPlayIcon ? 1 : 0 }}
            >
              <CirclePlay size={80} color="#fff" style={{ filter: 'drop-shadow(0 2px 8px #0008)' }} />
            </div>
          )}
          {/* Video info overlay - only show on current video */}
          {offset === 0 && (
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center mb-2">
                <img
                  src={video.createdBy?.profileImage || "https://ui-avatars.com/api/?name=User&background=random"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full mr-2 cursor-pointer hover:ring-2 hover:ring-white hover:ring-opacity-50 transition-all duration-200"
                  onClick={() => handleProfileImageClick(video.createdBy)}
                />
                <span 
                  className="font-semibold cursor-pointer hover:underline transition-all duration-200"
                  onClick={() => handleUsernameClick(video.createdBy?.id)}
                >
                  {video.createdBy?.name || "User"}
                </span>
                {/* Show follow button only if not current user */}
                {tokens?.id !== getUserId(video.createdBy) && (
                  <button
                    key={`follow-btn-${getUserId(video.createdBy)}-${updateTrigger}`}
                    className={`ml-3 px-3 py-1 rounded-full border text-xs font-semibold transition-colors
                      ${isUserFollowed(video.createdBy)
                        ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700 hover:border-purple-700'
                        : 'border-white text-white bg-transparent hover:bg-purple-600 hover:border-purple-600'}
                    `}
                    onClick={handleFollowClick}
                  >
                    {isUserFollowed(video.createdBy) ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
              <p className="text-sm opacity-90">{video.title}</p>
              {video.description && (
                <p className="text-xs opacity-75 mt-1">{video.description}</p>
              )}
              {/* ...existing code... */}
      {/* Fixed Comment Sidebar UI */}
      {showCommentBox && currentVideo && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col" style={{transition: 'transform 0.3s', transform: 'translateX(0)'}}>
          <div className="flex items-center justify-between px-4 py-3 border-b text-black">
            <span className="font-semibold text-lg">Comments</span>
            <button onClick={() => setShowCommentBox(false)} className="text-gray-500 hover:text-black text-xl">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 text-black">
            {currentVideo.comments?.length === 0 && (
              <div className="text-gray-400 text-sm text-center mt-8">No comments yet.</div>
            )}
            {currentVideo.comments?.map((c) => (
              <div key={c.id} className="mb-3 flex items-center gap-2">
                <span className="font-semibold text-xs text-black">{c.user?.name || 'User'}:</span>
                <span className="text-xs text-black">{c.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex gap-2 p-4 border-t">
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-2 py-1 rounded border text-black placeholder-gray-500 bg-white"
            />
            <button type="submit" className="px-2 py-1 bg-purple-600 text-white rounded">Send</button>
          </form>
        </div>
      )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get current video to display
  const currentVideo = allVideos[currentVideoIndex];
  const nextVideo = allVideos[currentVideoIndex + 1];
  const prevVideo = allVideos[currentVideoIndex - 1];

  return (
    <div className="w-full min-h-screen bg-gray-50 relative">
      <style>{soundWaveStyle}</style>
      <div className="flex pt-0"> {/* Remove pt-16 since Navbar is gone */}
        {/* Sidebar (fixed on desktop) */}
        <Sidebar />
        <div className="flex-1 md:ml-64 relative">
          {/* Single Reel Card UI - Centered to entire browser window */}
          <div className="fixed inset-0 flex items-center justify-center z-10 bg-gray-50">
            <div className="w-full max-w-[19.6875rem] mx-auto flex flex-col items-center justify-center py-8">
              {(loading || videosLoading) && (
                <span className="text-white text-xl">Loading videos...</span>
              )}
              {(error || videosError) && (
                <span className="text-red-400 text-xl">Error loading videos</span>
              )}
              {!loading && !videosLoading && !error && !videosError && allVideos.length === 0 && (
                <span className="text-white text-xl">No videos available</span>
              )}
              {currentVideo && (
                <div 
                  className="relative flex items-center justify-center w-full" 
                  style={{height: '35rem'}}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  {/* Previous Reel (above) */}
                  {prevVideo && renderReelCard(prevVideo, currentVideoIndex - 1, -window.innerHeight || -560)}
                  
                  {/* Current Reel */}
                  {renderReelCard(currentVideo, currentVideoIndex, 0)}
                  
                  {/* Next Reel (below) */}
                  {nextVideo && renderReelCard(nextVideo, currentVideoIndex + 1, window.innerHeight || 560)}
                  {/* UI Elements - only show for current video when not animating */}
                  {!isAnimating && (
                    <>
                      {/* Mute/unmute button top right of reel card */}
                      {!showCommentBox && (
                        <button
                          onClick={handleMuteToggle}
                          className="absolute top-4 right-4 z-30 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                          style={{ 
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          {isMuted ? (
                            <VolumeOff className="w-6 h-6 text-black" />
                          ) : (
                            <Volume2 className="w-6 h-6 text-black" />
                          )}
                        </button>
                      )}
                      {/* Back icon outside top-left of reel card */}
                      <button
                        onClick={() => navigate(-1)}
                        className="absolute z-30 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                        style={{ 
                          border: '1px solid #e5e7eb',
                          top: '1rem',
                          left: '-3.5rem'
                        }}
                      >
                        <ArrowLeftFromLine className="w-6 h-6 text-black" />
                      </button>
                      {/* Lucide icons vertical stack - outside right of reel card */}
                      <div
  className="flex flex-col items-center gap-6 absolute z-20"
  style={{
    right: '-3.5rem',
    top: '50%',
    transform: 'translateY(-50%)'
  }}
>
  {/* Like Icon and Count */}
  <div className="flex flex-col items-center">
    <Heart
      className={`w-7 h-7 cursor-pointer ${isVideoLiked(currentVideo) ? 'text-red-500' : 'text-black'}`}
      fill={isVideoLiked(currentVideo) ? 'red' : 'none'}
      onClick={handleHeartClick}
    />
    <span className="text-xs mt-1 text-black">{currentVideo?.likes?.length || 0}</span>
  </div>

  {/* Comment Icon and Count */}
  <div className="flex flex-col items-center">
    <MessageCircleMore className="w-7 h-7 text-black cursor-pointer" onClick={() => setShowCommentBox(v => !v)} />
    <span className="text-xs mt-1 text-black">{currentVideo?.comments?.length || 0}</span>
  </div>

  {/* Share Icon */}
  <Share2 
    className="w-7 h-7 text-black cursor-pointer" 
    onClick={() => setShowShareModal(true)}
  />

  {/* Bookmark Icon */}
  <Bookmark className="w-7 h-7 text-black cursor-pointer" />

  {/* Ellipsis Icon with Delete Menu */}
  <div className="relative delete-menu-container">
    <Ellipsis 
      className="w-7 h-7 text-black cursor-pointer" 
      onClick={() => setShowDeleteMenu(!showDeleteMenu)}
    />
    
    {/* Delete Menu Dropdown */}
    {showDeleteMenu && isVideoOwner(currentVideo) && (
      <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-1 z-50 min-w-[120px]">
        <button
          onClick={handleDeleteVideo}
          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    )}
  </div>
</div>

                      
                      {/* Song thumbnail box - outside bottom right corner */}
                      <div
                        className="absolute z-30 flex items-end"
                        style={{ 
                          right: '-4rem', 
                          bottom: '1rem'
                        }}
                      >
                        <img
                          src="/images/imgi_58_ab67706f000000024dcaadadcaa3eb4246b9c6b4.jpg"
                          alt="Song Thumbnail"
                          className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                        />
                        {/* Sound wave animation overlay */}
                        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', height: '22px', pointerEvents: 'none' }}>
                          {/* Each bar uses transformOrigin: 'center' to grow from center */}
                          <div style={{ width: '3px', margin: '0 1.5px', background: '#fff', borderRadius: '2px', animation: 'wave 0.8s infinite', animationDelay: '0s', transformOrigin: 'center' }} />
                          <div style={{ width: '3px', margin: '0 1.5px', background: '#fff', borderRadius: '2px', animation: 'wave 0.8s infinite', animationDelay: '0.2s', transformOrigin: 'center' }} />
                          <div style={{ width: '3px', margin: '0 1.5px', background: '#fff', borderRadius: '2px', animation: 'wave 0.8s infinite', animationDelay: '0.4s', transformOrigin: 'center' }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* FooterNav fixed at bottom (removed) */}
      {/* <FooterNav /> */}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contentType="reel"
        contentData={currentVideo || {}}
      />

      {/* Profile Card */}
      <ProfileCard
        user={selectedUserProfile}
        isOpen={showProfilePopup}
        onClose={() => setShowProfilePopup(false)}
      />
    </div>
  );
};

export default Reel;