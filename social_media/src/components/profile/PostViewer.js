import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaComment, FaShare, FaBookmark } from 'react-icons/fa';
import { BsThreeDots } from 'react-icons/bs';
import { useMutation } from '@apollo/client';
import { LIKE_POST, COMMENT_POST, REPLY_TO_COMMENT, LIKE_COMMENT, LIKE_REPLY, DELETE_COMMENT } from '../../graphql/mutations';
import { GetTokenFromCookie } from '../getToken/GetToken';

const PostViewer = ({ posts, initialIndex = 0, onClose, currentUser }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const modalRef = useRef(null);
  const commentInputRef = useRef(null);

  // Sanitize post data to prevent object rendering errors
  const sanitizePost = (post) => {
    if (!post) return null;
    const likesArray = Array.isArray(post.likes) ? post.likes : [];
    const likesCount = Array.isArray(post.likes)
      ? post.likes.length
      : (typeof post.likes === 'number' ? post.likes : 0);
    return {
      ...post,
      likes: likesArray,
      likesCount,
      user: post.user || post.createdBy || { name: 'Unknown User', profileImage: null },
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
  const [user, setUser] = useState(null);

  const currentPost = sanitizePost(posts[currentIndex]);
  const effectiveUserId = user?.id || currentUser?.id;
  const [likesCount, setLikesCount] = useState(0);
  const [commentsList, setCommentsList] = useState([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showReplies, setShowReplies] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [likedComments, setLikedComments] = useState({});
  const [commentMenus, setCommentMenus] = useState({});
  const postOverridesRef = useRef({}); // keep per-post UI overrides so UI doesn't revert

  const [likePostMutation] = useMutation(LIKE_POST);
  const [commentPostMutation] = useMutation(COMMENT_POST);
  const [replyToComment] = useMutation(REPLY_TO_COMMENT);
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [likeReply] = useMutation(LIKE_REPLY);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);

  useEffect(() => {
    const decoded = GetTokenFromCookie();
    setUser(decoded || null);
  }, []);

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

  // Initialize like/comment state from current post
  useEffect(() => {
    if (!currentPost) return;
    const pid = String(currentPost.id);
    const ov = postOverridesRef.current[pid];

    if (ov) {
      setLikesCount(typeof ov.likesCount === 'number' ? ov.likesCount : 0);
      setCommentsList(Array.isArray(ov.commentsList) ? ov.commentsList : (Array.isArray(currentPost.comments) ? currentPost.comments : []));
      setIsLiked(Boolean(ov.isLiked));
    } else {
      const initialLikes = Array.isArray(currentPost.likes) ? currentPost.likes.length : (typeof currentPost.likes === 'number' ? currentPost.likes : 0);
      setLikesCount(initialLikes);
      const incomingComments = Array.isArray(currentPost.comments) ? currentPost.comments : [];
      setCommentsList(incomingComments);

      if (effectiveUserId && Array.isArray(currentPost.likes)) {
        setIsLiked(currentPost.likes.some(l => l?.user?.id === effectiveUserId));
      } else {
        setIsLiked(false);
      }

      // initialize liked states for existing comment/reply likes for current user (for comment-like UI)
      if (user?.id) {
        const initLiked = {};
        incomingComments.forEach(c => {
          if (Array.isArray(c.likes) && c.likes.some(l => l?.user?.id === user.id)) {
            initLiked[c.id] = true;
          }
          if (Array.isArray(c.replies)) {
            c.replies.forEach(r => {
              if (Array.isArray(r.likes) && r.likes.some(l => l?.user?.id === user.id)) {
                initLiked[r.id] = true;
              }
            });
          }
        });
        setLikedComments(initLiked);
      } else {
        setLikedComments({});
      }
    }
  }, [currentIndex, currentPost?.id]);

  const handleLike = async () => {
    if (!effectiveUserId || !currentPost?.id) return;
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    // persist per-post override so UI doesn't revert
    const pid = String(currentPost.id);
    postOverridesRef.current[pid] = {
      ...(postOverridesRef.current[pid] || {}),
      isLiked: nextLiked,
      likesCount: nextCount,
      commentsList
    };
    try {
      await likePostMutation({ variables: { userId: String(effectiveUserId), postId: String(currentPost.id) } });
    } catch (err) {
      // revert on error
      setIsLiked(!nextLiked);
      setLikesCount(prev => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
      console.error('Like error:', err);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Add API call to save/unsave post
  };

  const handleComment = async () => {
    if (!comment.trim() || !effectiveUserId || !currentPost?.id) return;
    const newComment = {
      id: `local-${Date.now()}`,
      text: comment.trim(),
      user: {
        id: effectiveUserId,
        name: user?.name || currentUser?.name || 'You',
        username: user?.username || currentUser?.username || (user?.name || currentUser?.name || 'you').toLowerCase(),
        profileImage: user?.profileImage || currentUser?.profileImage || null
      },
      commentedAt: new Date().toISOString()
    };
    // optimistic add
    setCommentsList(prev => {
      const updated = [...prev, newComment];
      const pid = String(currentPost.id);
      postOverridesRef.current[pid] = {
        ...(postOverridesRef.current[pid] || {}),
        isLiked,
        likesCount,
        commentsList: updated
      };
      return updated;
    });
    setComment('');
    // ensure comments section remains visible like SocialPost
    if (!showComments) setShowComments(true);
    try {
      const { data } = await commentPostMutation({ variables: { userId: String(effectiveUserId), postId: String(currentPost.id), text: newComment.text } });
      const serverComments = data?.CommentPost;
      if (Array.isArray(serverComments)) {
        setCommentsList(serverComments);
        const pid = String(currentPost.id);
        postOverridesRef.current[pid] = {
          ...(postOverridesRef.current[pid] || {}),
          isLiked,
          likesCount,
          commentsList: serverComments
        };
      }
    } catch (err) {
      // revert on error
      setCommentsList(prev => prev.filter(c => c.id !== newComment.id));
      console.error('Comment error:', err);
    }
  };

  const toggleCommentMenu = (commentId) => {
    setCommentMenus(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (!user?.id) return;
    // Only allow post owner or comment owner
    const isPostOwner = Boolean(
      user?.id && (
        currentPost?.createdBy?.id === user.id ||
        currentPost?.user?.id === user.id
      )
    );
    const isCommentOwner = user.id === commentUserId;
    if (!isPostOwner && !isCommentOwner) return;

    const prev = commentsList;
    setCommentsList(prevList => prevList.filter(c => c.id !== commentId));
    try {
      await deleteCommentMutation({ variables: { userId: user.id, postId: currentPost.id, commentId } });
    } catch (e) {
      // rollback
      setCommentsList(prev);
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!effectiveUserId || !currentPost?.id) return;
    const next = !likedComments[commentId];
    setLikedComments(prev => ({ ...prev, [commentId]: next }));
    try {
      await likeComment({ variables: { userId: String(effectiveUserId), postId: String(currentPost.id), commentId: String(commentId) } });
    } catch (e) {
      setLikedComments(prev => ({ ...prev, [commentId]: !next }));
    }
  };

  const handleReplyLike = async (replyId, commentId) => {
    if (!effectiveUserId || !currentPost?.id) return;
    const next = !likedComments[replyId];
    setLikedComments(prev => ({ ...prev, [replyId]: next }));
    try {
      await likeReply({ variables: { userId: String(effectiveUserId), postId: String(currentPost.id), commentId: String(commentId), replyId: String(replyId) } });
    } catch (e) {
      setLikedComments(prev => ({ ...prev, [replyId]: !next }));
    }
  };

  const handleReplyToComment = async (commentId) => {
    const text = (replyTexts[commentId] || '').trim();
    if (!text || !effectiveUserId || !currentPost?.id) return;
    try {
      const { data } = await replyToComment({ variables: { userId: String(effectiveUserId), postId: String(currentPost.id), commentId: String(commentId), text } });
      const reply = data?.ReplyToComment;
      if (reply) {
        setCommentsList(prev => prev.map(c => c.id === commentId ? { ...c, replies: [ ...(c.replies || []), reply ] } : c));
      }
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setReplyInputs(prev => ({ ...prev, [commentId]: false }));
    } catch (e) {
      // ignore
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
        className="relative w-full h-full md:w-[75vw] md:h-[75vh] md:max-w-4xl md:max-h-[700px] md:ml-58 md:mt-18   bg-white md:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-xl"
        ref={modalRef}
      >
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-lg p-2 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* Navigation Arrows - Hidden on Mobile */}
        {currentIndex > 0 && (
          <button 
            className="hidden md:flex absolute top-1/2 left-5 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-xl p-3 rounded-full transition-all duration-200 items-center justify-center hover:scale-110 z-10"
            onClick={handlePrevious}
            aria-label="Previous post"
          >
            <FaChevronLeft />
          </button>
        )}
        
        {currentIndex < posts.length - 1 && (
          <button 
            className="hidden md:flex absolute top-1/2 right-5 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white text-xl p-3 rounded-full transition-all duration-200 items-center justify-center hover:scale-110 z-10"
            onClick={handleNext}
            aria-label="Next post"
          >
            <FaChevronRight />
          </button>
        )}

        {/* Post Content */}
        <div className="flex flex-col md:grid md:grid-cols-[auto_20rem] w-full h-full min-h-0">
          {/* Media Section */}
          <div 
            className="flex-1 min-w-0 max-w-full basis-auto flex items-center md:items-start justify-center bg-black relative touch-manipulation min-h-[55vh] md:min-h-0 overflow-hidden md:-mt-2"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            <div className="relative w-[85vw] max-w-[90%] aspect-[3/4] md:w-[360px] md:aspect-[3/4] md:h-auto">
              {currentPost.imageUrl ? (
                <img 
                  src={currentPost.imageUrl} 
                  alt="Post content"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                />
              ) : currentPost.videoUrl ? (
                <video 
                  src={currentPost.videoUrl}
                  controls
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                  <p>No media available</p>
                </div>
              )}
            </div>
            
            {/* Heart Animation for Double Tap */}
            {showHeartAnimation && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-8xl pointer-events-none z-10 animate-ping">
                <FaHeart className="animate-bounce" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-[20rem] md:shrink-0 md:h-full bg-white flex flex-col min-h-0 border-l-0 md:border-l border-gray-200 border-t md:border-t-0 max-h-[45vh] md:max-h-none">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
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
              <div className="p-3 border-b border-gray-200">
                <span className="font-semibold text-sm text-gray-800">
                  {currentPost.user?.name || 'Unknown User'}
                </span>
                <span className="ml-2 text-sm text-gray-800 leading-relaxed">
                  {currentPost.caption}
                </span>
              </div>
            )}

            {/* Comments Section (Real data with actions) */}
            <div className={`${showAllComments ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-none overflow-hidden md:max-h-[12rem]'} p-3 max-h-48 md:max-h-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 hover:scrollbar-thumb-gray-400/60`}>
              <div className="flex flex-col gap-2">
                {Array.isArray(commentsList) && commentsList.length > 0 ? (
                  (showAllComments ? commentsList : commentsList.slice(0, 2)).map((cmt, i) => (
                    <div key={cmt.id || `c-${i}`} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <img 
                          src={cmt.user?.profileImage || `https://ui-avatars.com/api/?name=${cmt.user?.name || cmt.user?.username || 'U'}&background=random`}
                          alt={cmt.user?.name || cmt.user?.username || 'User'}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg px-2.5 py-2 group relative">
                            <p className="text-sm flex items-start justify-between gap-2">
                              <span className="font-semibold">{cmt.user?.username || cmt.user?.name || 'user'}</span>
                              <button onClick={() => toggleCommentMenu(cmt.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 px-1">
                                <BsThreeDots />
                              </button>
                            </p>
                            <p className="text-sm mt-1">{cmt.text}</p>
                            {commentMenus[cmt.id] && (
                              <div className="absolute right-2 top-8 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                <button onClick={() => { toggleCommentMenu(cmt.id); handleDeleteComment(cmt.id, cmt.user?.id); }} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 gap-2 text-sm font-medium">
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <button onClick={() => handleCommentLike(cmt.id)} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${likedComments[cmt.id] ? 'text-red-500' : ''}`}>
                              <FaHeart className={likedComments[cmt.id] ? 'fill-current' : ''} />
                              {likedComments[cmt.id] ? 'Liked' : 'Like'}
                            </button>
                            <button onClick={() => setReplyInputs(prev => ({ ...prev, [cmt.id]: !prev[cmt.id] }))} className="hover:text-blue-500 transition-colors">Reply</button>
                            {Array.isArray(cmt.replies) && cmt.replies.length > 0 && (
                              <button onClick={() => setShowReplies(prev => ({ ...prev, [cmt.id]: !prev[cmt.id] }))} className="hover:text-purple-500 transition-colors">
                                {showReplies[cmt.id] ? 'Hide' : 'View'} {cmt.replies.length} replies
                              </button>
                            )}
                          </div>
                          {replyInputs[cmt.id] && (
                            <div className="mt-2 flex gap-2">
                              <input type="text" placeholder="Write a reply..." value={replyTexts[cmt.id] || ''} onChange={(e) => setReplyTexts(prev => ({ ...prev, [cmt.id]: e.target.value }))} className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-purple-500" onKeyPress={(e) => { if (e.key === 'Enter') { handleReplyToComment(cmt.id); } }} />
                              <button onClick={() => handleReplyToComment(cmt.id)} disabled={!replyTexts[cmt.id]?.trim()} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${replyTexts[cmt.id]?.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Reply</button>
                            </div>
                          )}
                          {showReplies[cmt.id] && Array.isArray(cmt.replies) && (
                            <div className="mt-2 ml-4 space-y-2">
                              {cmt.replies.map((rep) => (
                                <div key={rep.id} className="flex items-start gap-2">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                    {(rep.user?.name || rep.user?.username || 'R').charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-green-50 rounded-lg px-3 py-2">
                                      <p className="text-xs"><span className="font-semibold">{rep.user?.name || rep.user?.username || 'user'}</span> {rep.text}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                      <button onClick={() => handleReplyLike(rep.id, cmt.id)} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${likedComments[rep.id] ? 'text-red-500' : ''}`}>
                                        <FaHeart className={likedComments[rep.id] ? 'fill-current' : ''} />
                                        {likedComments[rep.id] ? 'Liked' : 'Like'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No comments yet</p>
                )}
                {commentsList.length > 2 && (
                  <button onClick={() => setShowAllComments(v => !v)} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    {showAllComments ? 'Show less' : `View all ${commentsList.length} comments`}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
              <div className="border-t border-gray-200 p-3 mt-auto">
               <div className="flex items-center gap-3 mb-2">
                <button 
                  className={`text-xl transition-all duration-200 hover:scale-110 p-1 ${isLiked ? 'text-red-500' : 'text-gray-800 hover:text-gray-600'}`}
                  onClick={handleLike}
                >
                  <FaHeart />
                </button>
                <button 
                  className="text-xl text-gray-800 hover:text-gray-600 transition-all duration-200 hover:scale-110 p-1"
                  onClick={() => {
                    setShowComments(true);
                    // Focus the input when opening
                    setTimeout(() => commentInputRef.current && commentInputRef.current.focus(), 0);
                  }}
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
               <div className="mb-2">
                <span className="font-semibold text-sm text-gray-800">
                  {likesCount} likes
                </span>
              </div>

               {/* Comment Input - only after clicking comment icon */}
               {showComments && (
                 <div className="flex items-center gap-2 border-t border-gray-200 pt-2">
                   <input
                     ref={commentInputRef}
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
               )}
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