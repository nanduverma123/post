import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaHeart, FaComment, FaShare, FaBookmark, FaTrash } from 'react-icons/fa';
import { BsThreeDots } from 'react-icons/bs';
import { useMutation } from '@apollo/client';
import { LIKE_POST, COMMENT_POST } from '../../graphql/mutations';
import { GetTokenFromCookie, GetRawTokenFromCookie } from '../getToken/GetToken';
import ShareModal from '../share/ShareModal';
import axios from 'axios';

const MobilePostViewer = ({ posts, initialIndex = 0, onClose, currentUser }) => {
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [isLiked, setIsLiked] = useState({});
  const scrollContainerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [shareForPost, setShareForPost] = useState(null);

  useEffect(() => {
    const decoded = GetTokenFromCookie();
    setUser(decoded || null);
  }, []);

  const [likePostMutation] = useMutation(LIKE_POST);
  const [commentPostMutation] = useMutation(COMMENT_POST);

  // Sanitize post data to prevent object rendering errors
  const sanitizePost = (post) => {
    const safeUser = post?.user || post?.createdBy || { name: 'Unknown User', username: 'user', profileImage: null };
    const postId = post?.id || `post-${Math.random()}`;
    
    return {
      ...post,
      id: postId,
      likes:
        typeof post?.likes === 'number'
          ? post.likes
          : Array.isArray(post?.likes)
          ? post.likes.length
          : 0,
      commentsCount:
        typeof post?.commentsCount === 'number'
          ? post.commentsCount
          : Array.isArray(post?.comments)
          ? post.comments.length
          : 0,
      comments: Array.isArray(post?.comments)
        ? post.comments.map((c) => {
            const cu = c?.user || c?.commentedBy || {};
            return {
              ...c,
              user: {
                id: cu.id || c?.userId || undefined,
                name: cu.name || c?.name || 'User',
                username: cu.username || c?.username || (cu.name ? String(cu.name).toLowerCase().replace(/\s+/g, '') : 'user'),
                profileImage: cu.profileImage || c?.avatar || null,
              },
            };
          })
        : [],
      user: safeUser,
      username: safeUser?.username || safeUser?.name || 'Unknown User',
      caption: typeof post?.caption === 'string' ? post.caption : '',
      createdAt: post?.createdAt || new Date().toISOString()
    };
  };

  // Initialize state for posts when they change
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    
    posts.forEach((post) => {
      const postId = post?.id || `post-${Math.random()}`;
      
      // Initialize likes count
      if (!likes[postId]) {
        setLikes(prev => ({
          ...prev,
          [postId]: Array.isArray(post?.likes) ? post.likes.length : (typeof post?.likes === 'number' ? post.likes : 0)
        }));
      }
      
      // Initialize comment count
      if (!commentCounts[postId]) {
        setCommentCounts(prev => ({
          ...prev,
          [postId]: Array.isArray(post?.comments) ? post.comments.length : (typeof post?.comments === 'number' ? post.comments : 0)
        }));
      }
      
      // Initialize like state
      if (!isLiked[postId]) {
        setIsLiked(prev => ({
          ...prev,
          [postId]: Array.isArray(post?.likes) && user?.id ? post.likes.some(like => like.user?.id === user.id) : false
        }));
      }
    });
  }, [posts, user?.id]);

  // Scroll to initial post on mount (feed-style, not full-screen per post)
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const target = scrollContainerRef.current.querySelector(
      `[data-post-index="${initialIndex}"]`
    );
    if (target) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  const handleLike = async (postId) => {
    if (!user?.id || !postId) return;
    
    // Validate IDs for GraphQL operations
    const validUserId = String(user.id).trim();
    const validPostId = String(postId).trim();
    
    if (!validUserId || validUserId === 'undefined' || validUserId === 'null') {
      console.warn('❌ Invalid user ID for like operation:', { userId: user.id, validUserId });
      return;
    }
    
    if (!validPostId || validPostId === 'undefined' || validPostId === 'null') {
      console.warn('❌ Invalid post ID for like operation:', { postId, validPostId });
      return;
    }
    
    console.log(`👍 Mobile attempting to ${isLiked[postId] ? 'unlike' : 'like'} post`, { 
      userId: validUserId, 
      postId: validPostId,
      currentLiked: isLiked[postId]
    });
    
    const currentLikeState = isLiked[postId] || false;
    const currentLikesCount = likes[postId] || 0;
    
    // Optimistic update
    setIsLiked(prev => ({
      ...prev,
      [postId]: !currentLikeState
    }));
    
    setLikes(prev => ({
      ...prev,
      [postId]: currentLikeState ? currentLikesCount - 1 : currentLikesCount + 1
    }));
    
    try {
      await likePostMutation({ variables: { userId: validUserId, postId: validPostId } });
      console.log(`✅ Mobile successfully ${!currentLikeState ? 'liked' : 'unliked'} post ${validPostId}`);
    } catch (error) {
      console.error('❌ Mobile like error details:', {
        error,
        message: error.message,
        variables: { userId: validUserId, postId: validPostId },
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors
      });
      
      // Revert optimistic update on error
      setIsLiked(prev => ({
        ...prev,
        [postId]: currentLikeState
      }));
      setLikes(prev => ({
        ...prev,
        [postId]: currentLikesCount
      }));
    }
  };

  const handleSave = (postId) => {
    setSavedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    // TODO: Add API call to save/unsave post
  };

  const handleComment = async (postId, commentText) => {
    if (!commentText.trim() || !user?.id || !postId) return;
    
    // Validate IDs for GraphQL operations
    const validUserId = String(user.id).trim();
    const validPostId = String(postId).trim();
    
    if (!validUserId || validUserId === 'undefined' || validUserId === 'null') {
      console.warn('❌ Invalid user ID for comment operation:', { userId: user.id, validUserId });
      return;
    }
    
    if (!validPostId || validPostId === 'undefined' || validPostId === 'null') {
      console.warn('❌ Invalid post ID for comment operation:', { postId, validPostId });
      return;
    }
    
    console.log('💬 Mobile attempting to add comment', { 
      userId: validUserId, 
      postId: validPostId,
      commentText: commentText.trim()
    });
    
    const currentCommentCount = commentCounts[postId] || 0;
    
    // Optimistic update
    setCommentCounts(prev => ({
      ...prev,
      [postId]: currentCommentCount + 1
    }));
    
    // Add comment to local state with real user info
    const localComment = {
      id: `local-${Date.now()}`,
      text: commentText.trim(),
      user: {
        id: validUserId,
        name: user.name || 'You',
        username: user.username || (user.name || 'you').toLowerCase(),
        profileImage: user.profileImage || null
      },
      commentedAt: new Date().toISOString()
    };

    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), localComment]
    }));
    
    try {
      await commentPostMutation({ variables: { userId: validUserId, postId: validPostId, text: commentText } });
      console.log(`✅ Mobile successfully added comment to post ${validPostId}`);
    } catch (error) {
      console.error('❌ Mobile comment error details:', {
        error,
        message: error.message,
        variables: { userId: validUserId, postId: validPostId, text: commentText },
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors
      });
      
      // Revert optimistic update on error
      setCommentCounts(prev => ({
        ...prev,
        [postId]: currentCommentCount
      }));
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).slice(0, -1)
      }));
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

  const PostCard = ({ post, index }) => {
    const [comment, setComment] = useState('');
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const sanitizedPost = sanitizePost(post);
    const postId = sanitizedPost.id || `post-${index}`;
    const isOwner = Boolean(
      user?.id && (
        sanitizedPost?.createdBy?.id === user.id ||
        sanitizedPost?.user?.id === user.id ||
        sanitizedPost?.userId === user.id
      )
    );
    const mergedComments = [
      ...(sanitizedPost.comments || []),
      ...((comments[postId] || []))
    ];

    const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
        // Double tap detected
        if (!isLiked[postId]) {
          handleLike(postId);
          setShowHeartAnimation(true);
          setTimeout(() => setShowHeartAnimation(false), 1000);
        }
      } else {
        setLastTap(now);
      }
    };

    const handleCommentSubmit = () => {
      if (comment.trim()) {
        handleComment(postId, comment);
        setComment('');
      }
    };

    const handleDeletePost = async () => {
      if (!user?.id) return;
      const confirmDelete = window.confirm('Delete this post?');
      if (!confirmDelete) return;

      try {
        const mutation = `
          mutation DeletePost($id: ID!) {
            DeletePost(id: $id)
          }
        `;
        const variables = { id: postId };
        await axios.post('http://localhost:5000/graphql', { query: mutation, variables }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GetRawTokenFromCookie() || ''}`,
          },
          withCredentials: true,
        });

        // Notify app and close viewer
        window.dispatchEvent(new Event('postDeleted'));
        onClose && onClose();
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
      }
    };

    return (
      <div className="w-full bg-white flex items-start justify-center p-2 relative">
        {/* Floating close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 bg-white/90 rounded-full p-2 shadow-md text-gray-800"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* Post Card */}
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <img
                src={sanitizedPost.user?.profileImage || `https://ui-avatars.com/api/?name=${sanitizedPost.username}&background=random`}
                alt={sanitizedPost.username}
                className="w-7 h-7 rounded-full object-cover"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-[13px] text-gray-900">@{sanitizedPost.username}</span>
                <span className="text-[11px] text-gray-500">{formatTime(sanitizedPost.createdAt)}</span>
              </div>
            </div>
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600" onClick={() => setShowMenu(v => !v)}>
                <BsThreeDots />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  <button
                    className="flex items-center w-full px-4 py-2 text-purple-600 hover:bg-purple-50 text-sm font-medium"
                    onClick={() => { setShowMenu(false); handleSave(postId); }}
                  >
                    <FaBookmark className="mr-2 text-purple-600" />
                    {savedPosts.has(postId) ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  {isOwner && (
                    <button
                      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-medium border-t border-gray-100"
                      onClick={() => { setShowMenu(false); handleDeletePost(); }}
                    >
                      <FaTrash className="mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Media */}
          <div className="w-full bg-black relative" onClick={handleDoubleTap}>
            {sanitizedPost.imageUrl ? (
              <img
                src={sanitizedPost.imageUrl}
                alt="Post content"
                className="w-full h-auto object-cover"
              />
            ) : sanitizedPost.videoUrl ? (
              <video
                src={sanitizedPost.videoUrl}
                controls
                className="w-full h-auto object-contain bg-black"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm bg-gray-50">
                <p>No media available</p>
              </div>
            )}

            {/* Heart Animation for Double Tap */}
            {showHeartAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <FaHeart className="text-red-500 text-7xl animate-ping" />
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="px-3 pt-3">
            {sanitizedPost.caption ? (
              <p className="text-[13px] text-gray-900">
                <span className="font-semibold mr-1">@{sanitizedPost.username}</span>
                {sanitizedPost.caption}
              </p>
            ) : (
              <p className="text-[13px] text-gray-500">&nbsp;</p>
            )}
            <p className="text-[11px] text-gray-500 mt-1">Created at {new Date(sanitizedPost.createdAt).toLocaleString()}</p>
          </div>

          {/* Actions / Counts */}
          <div className="px-3 py-2 mt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  className={`flex items-center gap-1 text-sm ${isLiked[postId] ? 'text-red-500' : 'text-gray-700'}`}
                  onClick={() => handleLike(postId)}
                >
                  <FaHeart className="text-[16px]" />
                  <span className="text-[13px]">{likes[postId] || 0}</span>
                </button>
                <button className="flex items-center gap-1 text-gray-700" onClick={() => setShowComments((v) => !v)}>
                  <FaComment className="text-[16px]" />
                  <span className="text-[13px]">{commentCounts[postId] || 0}</span>
                </button>
              </div>
              <button className="flex items-center gap-1 text-gray-700 text-sm" onClick={() => setShareForPost(sanitizedPost)}>
                <FaShare className="text-[16px]" />
                <span className="text-[13px]">Share</span>
              </button>
            </div>
          </div>

          {/* Comments List */}
          {showComments && (
            <div className="px-3 pb-2">
              {mergedComments.length === 0 ? (
                <p className="text-[12px] text-gray-500">No comments yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {mergedComments.map((cmt, i) => (
                    <div key={cmt.id || `c-${i}`} className="flex items-start gap-2">
                      <img
                        src={cmt.user?.profileImage || `https://ui-avatars.com/api/?name=${cmt.user?.name || cmt.user?.username || cmt.username || 'U'}&background=random`}
                        alt={cmt.user?.name || cmt.user?.username || cmt.username || 'User'}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="bg-gray-100 rounded-lg px-3 py-1.5 flex-1">
                        <p className="text-[12px] text-gray-900">
                          <span className="font-semibold mr-1">{cmt.user?.username || cmt.user?.name || cmt.username || 'user'}</span>
                          {cmt.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comment Input */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                className="flex-1 bg-transparent text-[13px] placeholder-gray-500 outline-none text-gray-900"
              />
              {comment.trim() && (
                <button
                  onClick={handleCommentSubmit}
                  className="text-blue-500 font-semibold text-[13px]"
                >
                  Post
                </button>
              )}
              <button
                className={`ml-1 ${savedPosts.has(postId) ? 'text-yellow-500' : 'text-gray-500'}`}
                onClick={() => handleSave(postId)}
                aria-label="Save"
              >
                <FaBookmark />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Safety check for posts - after all hooks
  if (!posts || posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
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

  return (
    <div className="fixed inset-0 bg-white z-40">
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto pb-24"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {posts.map((post, index) => (
          <div
            key={post.id || `post-${index}`}
            className={`${index === 0 ? 'pt-16' : ''} py-2`}
            data-post-index={index}
          >
            <PostCard post={post} index={index} />
          </div>
        ))}
      </div>
      {shareForPost && (
        <ShareModal
          isOpen={!!shareForPost}
          onClose={() => setShareForPost(null)}
          contentType="post"
          contentData={shareForPost}
        />
      )}
    </div>
  );
};

export default MobilePostViewer;