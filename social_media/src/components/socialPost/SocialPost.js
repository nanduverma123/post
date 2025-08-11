// import React, { useState } from "react";
// import { FaHeart, FaComment, FaPaperPlane, FaEllipsisV, FaBookmark, FaTrash } from "react-icons/fa";

// const SocialPost = ({ avatarSrc, username, handle, postImageSrc, caption, initialLikes, initialComments, onDelete, onLike,isInitiallyLiked }) => {
//   const [likes, setLikes] = useState(initialLikes);
//   const [commentCount, setCommentCount] = useState(initialComments);
//   const [isLiked, setIsLiked] = useState(isInitiallyLiked);
//   const [showCommentInput, setShowCommentInput] = useState(false);
//   const [newCommentText, setNewCommentText] = useState("");
//   const [comments, setComments] = useState([]);
//   const [showMenu, setShowMenu] = useState(false);
//         console.log(isLiked);
        
  
//   const handleLike = (PostId) => {
//     setLikes(isLiked ? likes - 1 : likes + 1);
//     setIsLiked(!isLiked);
//     onLike(PostId);
//   };

//   const handleCommentClick = () => {
//     setShowCommentInput(!showCommentInput);
//   };

//   const handleCommentSubmit = (e) => {
//     e.preventDefault();
//     if (newCommentText.trim()) {
//       setComments((prev) => [...prev, { id: Date.now(), username: "You", text: newCommentText.trim() }]);
//       setCommentCount(commentCount + 1);
//       setNewCommentText("");
//     }
//   };
  

//   return (
//     <div className="m-4 rounded-lg shadow bg-white">
//       <div className="flex items-center justify-between px-4 py-2 relative">
//         <div className="flex items-center gap-3">
//           <img src={avatarSrc} alt="avatar" className="w-11 h-11 rounded-full object-cover" />
//           <div>
//             <div className="font-bold">{handle}</div>
//             <div className="text-sm text-gray-500">{username}</div>
//           </div>
//         </div>
//         <div className="relative">
//           <button
//             className="p-2 rounded-full hover:bg-gray-100 transition"
//             aria-label="Post options"
//             onClick={() => setShowMenu((prev) => !prev)}
//           >
//             <FaEllipsisV className="text-gray-500 text-lg" />
//           </button>
//           {showMenu && (
//             <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
//               <button
//                 className="flex items-center w-full px-4 py-2 text-purple-600 hover:bg-purple-50 gap-2 text-sm font-semibold rounded-t-lg"
//                 onClick={() => setShowMenu(false)}
//               >
//                 <FaBookmark className="text-purple-600" />
//                 Bookmark
//               </button>
//               <button
//                 className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 gap-2 text-sm font-semibold rounded-b-lg"
//                onClick={onDelete}
//               >
//                 <FaTrash className="text-red-600" />
//                 Delete
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//       <img src={postImageSrc} alt="post" className="w-full max-h-96 object-cover rounded-lg" />
//       {/* Caption Section */}
//       {caption && (
//         <div className="px-4 py-2 text-sm">
//           <span className="font-bold mr-2">{handle}</span>
//           <span className="text-gray-800">{caption}</span>
//         </div>
//       )}
//       <div className="flex justify-around py-3 text-sm text-gray-700">
//         <button onClick={handleLike} className="flex items-center gap-1 cursor-pointer">
//           <FaHeart className={isLiked ? "text-red-500" : ""} />
//           <span>{likes.toLocaleString()}</span>
//         </button>
//         <button onClick={handleCommentClick} className="flex items-center gap-1 cursor-pointer">
//           <FaComment />
//           <span>{commentCount.toLocaleString()}</span>
//         </button>
//         <div className="flex items-center gap-1">
//           <FaPaperPlane />
//           <span>9.8K</span>
//         </div>
//       </div>

//       {showCommentInput && (
//         <form onSubmit={handleCommentSubmit} className="p-4 border-t border-gray-200">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               placeholder="Add a comment..."
//               className="flex-grow border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
//               value={newCommentText}
//               onChange={(e) => setNewCommentText(e.target.value)}
//             />
//             <button
//               type="submit"
//               className="bg-purple-600 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-purple-700 cursor-pointer"
//             >
//               Post
//             </button>
//           </div>
//         </form>
//       )}

//       {comments.length > 0 && (
//         <div className="px-4 pb-4">
//           {comments.map((comment) => (
//             <div key={comment.id} className="mt-2 text-sm">
//               <span className="font-bold">{comment.username}:</span> {comment.text}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SocialPost; 






import React, { useEffect, useState, useRef } from "react";
import {
  FaHeart,
  FaComment,
  FaPaperPlane,
  FaEllipsisV,
  FaBookmark,
  FaTrash,
} from "react-icons/fa";
import { useMutation, useQuery } from '@apollo/client';
import { REPLY_TO_COMMENT, LIKE_COMMENT, LIKE_REPLY, GET_COMMENT_DETAILS, DELETE_COMMENT } from '../../graphql/mutations';
import ShareModal from '../share/ShareModal';
import { useNotifications } from '../../context/NotificationContext';
import { usePersistentLikes, usePersistentCommentDetails } from '../../hooks/usePersistentData';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import HeartIconPopup from '../notifications/HeartIconPopup';

const SocialPost = ({
  avatarSrc,
  username,
  handle,
  postImageSrc,
  postVideoSrc,
  caption,
  initialLikes,
  initialComments,
  onDelete,
  onLike,
  isInitiallyLiked,
  onComment,
  postId,
  postData,
  existingComments = []
}) => {
  
  const [likes, setLikes] = useState(initialLikes);
  const [commentCount, setCommentCount] = useState(initialComments);
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [comments, setComments] = useState(existingComments || []);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showReplies, setShowReplies] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [commentMenus, setCommentMenus] = useState({});
  
  // Persistent data hooks
  const [likedComments, setLikedComments] = usePersistentLikes();
  const [commentDetails, setCommentDetails] = usePersistentCommentDetails();
  
  // Heart icon popup functionality
  const { popupNotifications } = useRealTimeNotifications();
  const commentLikeButtonRefs = useRef({});
  const replyLikeButtonRefs = useRef({});
  const postLikeButtonRef = useRef(null);
  
  // Get notification context for simulating notifications
  const { addNewNotification, user: currentUser } = useNotifications();
  
  // GraphQL mutations
  const [replyToComment] = useMutation(REPLY_TO_COMMENT);
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [likeReply] = useMutation(LIKE_REPLY);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);

  // Only owners can see Delete option
  const isOwner = Boolean(
    currentUser?.id && (
      postData?.createdBy?.id === currentUser.id ||
      postData?.user?.id === currentUser.id ||
      postData?.userId === currentUser.id
    )
  );

  // 👉 Refresh hone ke baad bhi isLiked aur likes update ho jaye
  useEffect(() => {
    setIsLiked(isInitiallyLiked);
    setLikes(initialLikes);
    setComments(existingComments || []);
    setShowAllComments(false); // Always start with comments hidden
    
    // Initialize comment details with replies from backend
    if (existingComments && existingComments.length > 0) {
      const initialCommentDetails = {};
      const initialLikedComments = {};
      
      existingComments.forEach(comment => {
        // Initialize replies
        if (comment.replies && comment.replies.length > 0) {
          initialCommentDetails[comment.id] = {
            replies: comment.replies
          };
        }
        
        // Initialize comment likes (check if current user liked this comment)
        if (comment.likes && currentUser?.id) {
          const userLiked = comment.likes.some(like => like.user.id === currentUser.id);
          if (userLiked) {
            initialLikedComments[comment.id] = true;
          }
        }
        
        // Initialize reply likes
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (reply.likes && currentUser?.id) {
              const userLiked = reply.likes.some(like => like.user.id === currentUser.id);
              if (userLiked) {
                initialLikedComments[reply.id] = true;
              }
            }
          });
        }
      });
      
      setCommentDetails(prev => ({ ...prev, ...initialCommentDetails }));
      setLikedComments(prev => ({ ...prev, ...initialLikedComments }));
    }
  }, [isInitiallyLiked, initialLikes, existingComments, currentUser?.id]);

  const handleLike = (PostId) => {
    setLikes(isLiked ? likes - 1 : likes + 1);
    setIsLiked(!isLiked);
    onLike(PostId); // Backend call
  };

  const handleCommentClick = () => {
    setShowCommentInput(!showCommentInput);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();

    if (newCommentText.trim()) {
      onComment(newCommentText)
      setComments((prev) => [
        ...prev,
        { 
          id: Date.now(), 
          username: currentUser?.name || currentUser?.username || "You", 
          text: newCommentText.trim(),
          user: {
            name: currentUser?.name || "You",
            username: currentUser?.username || "you",
            profileImage: currentUser?.profileImage || "https://ui-avatars.com/api/?name=You&background=6366f1&color=fff&size=64"
          }
        },
      ]);
      setCommentCount(commentCount + 1);
      setNewCommentText("");
    }
  };

  const toggleCommentMenu = (commentId) => {
    setCommentMenus((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Only author can delete comments
  const handleDeleteComment = async (commentId) => {
    if (!isOwner || !currentUser?.id) return;

    // Optimistic remove
    const previousComments = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((prev) => (prev > 0 ? prev - 1 : 0));

    try {
      await deleteCommentMutation({
        variables: {
          userId: currentUser.id,
          postId: postId,
          commentId: commentId,
        },
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Rollback on error
      setComments(previousComments);
      setCommentCount((prev) => prev + 1);
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId) => {
    if (!currentUser?.id) return;
    
    const isLiking = !likedComments[commentId];
    
    // Optimistic update
    setLikedComments(prev => ({
      ...prev,
      [commentId]: isLiking
    }));

    try {
      await likeComment({
        variables: {
          userId: currentUser.id,
          postId: postId,
          commentId: commentId
        }
      });

      // Trigger heart popup for comment like
      if (isLiking) {
        addNewNotification({
          id: Date.now() + Math.random(),
          type: 'comment_like',
          message: 'You liked this comment',
          sender: {
            name: currentUser.name || 'You',
            username: currentUser.username || 'you',
            profileImage: currentUser.profileImage || 'https://ui-avatars.com/api/?name=You&background=6366f1&color=fff&size=64'
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert optimistic update on error
      setLikedComments(prev => ({
        ...prev,
        [commentId]: !isLiking
      }));
    }
  };

  // Handle reply like
  const handleReplyLike = async (replyId, commentId) => {
    if (!currentUser?.id) return;
    
    const isLiking = !likedComments[replyId];
    
    // Optimistic update
    setLikedComments(prev => ({
      ...prev,
      [replyId]: isLiking
    }));

    try {
      await likeReply({
        variables: {
          userId: currentUser.id,
          postId: postId,
          commentId: commentId,
          replyId: replyId
        }
      });

      // Trigger heart popup for reply like
      if (isLiking) {
        addNewNotification({
          id: Date.now() + Math.random(),
          type: 'reply_like',
          message: 'You liked this reply',
          sender: {
            name: currentUser.name || 'You',
            username: currentUser.username || 'you',
            profileImage: currentUser.profileImage || 'https://ui-avatars.com/api/?name=You&background=10b981&color=fff&size=64'
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error liking reply:', error);
      // Revert optimistic update on error
      setLikedComments(prev => ({
        ...prev,
        [replyId]: !isLiking
      }));
    }
  };

  // Handle reply to comment
  const handleReplyToComment = async (commentId) => {
    const replyText = replyTexts[commentId]?.trim();
    if (!replyText || !currentUser?.id) return;

    try {
      const { data } = await replyToComment({
        variables: {
          userId: currentUser.id,
          postId: postId,
          commentId: commentId,
          text: replyText
        }
      });

      if (data?.ReplyToComment) {
        // Add reply to comment details with real data from backend
        setCommentDetails(prev => ({
          ...prev,
          [commentId]: {
            ...prev[commentId],
            replies: [
              ...(prev[commentId]?.replies || []),
              {
                id: data.ReplyToComment.id,
                text: data.ReplyToComment.text,
                user: data.ReplyToComment.user,
                repliedAt: data.ReplyToComment.repliedAt
              }
            ]
          }
        }));

        // Show success notification
        addNewNotification({
          id: Date.now() + Math.random(),
          type: 'reply',
          message: 'Reply added successfully',
          sender: {
            name: currentUser.name || 'You',
            username: currentUser.username || 'you',
            profileImage: currentUser.profileImage || 'https://ui-avatars.com/api/?name=You&background=10b981&color=fff&size=64'
          },
          createdAt: new Date().toISOString()
        });
      }

      // Clear reply input
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setReplyInputs(prev => ({ ...prev, [commentId]: false }));
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  // Toggle reply input
  const toggleReplyInput = (commentId) => {
    setReplyInputs(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Toggle replies display
  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return (
    <div className="m-4 rounded-lg shadow bg-white">
      <div className="flex items-center justify-between px-4 py-2 relative">
        <div className="flex items-center gap-3">
          <img
            src={avatarSrc}
            alt="avatar"
            className="w-11 h-11 rounded-full object-cover"
          />
          <div>
            <div className="font-bold">{handle}</div>
            <div className="text-sm text-gray-500">{username}</div>
          </div>
        </div>
        <div className="relative">
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Post options"
            onClick={() => setShowMenu((prev) => !prev)}
          >
            <FaEllipsisV className="text-gray-500 text-lg" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <button
                className="flex items-center w-full px-4 py-2 text-purple-600 hover:bg-purple-50 gap-2 text-sm font-semibold rounded-t-lg"
                onClick={() => setShowMenu(false)}
              >
                <FaBookmark className="text-purple-600" />
                Bookmark
              </button>
              {isOwner && (
                <button
                  className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 gap-2 text-sm font-semibold rounded-b-lg"
                  onClick={onDelete}
                >
                  <FaTrash className="text-red-600" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    {postImageSrc ? (
  <img
    src={postImageSrc}
    alt="post"
    className="w-full max-h-96 object-cover rounded-lg"
  />
) : postVideoSrc ? (
  <video
    src={postVideoSrc}
    controls
    className="w-full max-h-96 object-cover rounded-lg"
    preload="metadata"
    style={{ maxHeight: '400px' }}
  >
    Your browser does not support the video tag.
  </video>
) : null}


      {caption && (
        <div className="px-4 py-2 text-sm">
          <span className="font-bold mr-2">{handle}</span>
          <span className="text-gray-800">{caption}</span>
        </div>
      )}

      <div className="flex justify-around py-3 text-sm text-gray-700">
        <button
          ref={postLikeButtonRef}
          onClick={() => handleLike(postId)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <FaHeart className={isLiked ? "text-red-500" : ""} />
          <span>{likes.toLocaleString()}</span>
        </button>
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1 cursor-pointer"
        >
          <FaComment />
          <span>{commentCount.toLocaleString()}</span>
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <FaPaperPlane />
          <span>Share</span>
        </button>
      </div>

      {showCommentInput && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <form onSubmit={handleCommentSubmit}>
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                {currentUser?.profileImage ? (
                  <img 
                    src={currentUser.profileImage} 
                    alt={currentUser.name || currentUser.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {(currentUser?.name || currentUser?.username)?.charAt(0) || 'Y'}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-grow border-0 bg-transparent text-sm focus:outline-none placeholder-gray-500"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className={`text-sm font-semibold transition-colors ${
                  newCommentText.trim() 
                    ? 'text-purple-600 hover:text-purple-700 cursor-pointer' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                Post
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COMMENTS SECTION WITH REPLIES */}
      {comments.length > 0 && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {(showAllComments ? comments : comments.slice(0, 2)).map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main Comment */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                    {comment.user?.profileImage ? (
                      <img 
                        src={comment.user.profileImage} 
                        alt={comment.user.name || comment.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                        {(comment.user?.name || comment.username)?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-3 py-2 group relative">
                      <p className="text-sm flex items-start justify-between gap-3">
                        <span className="font-semibold">
                          {comment.user?.name || comment.username}
                          {/* Show "author" label if commenter is the post owner */}
                          {(comment.user?.id === postData?.createdBy?.id || 
                            comment.user?.id === postData?.user?.id || 
                            comment.user?.id === postData?.userId) && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                              author
                            </span>
                          )}
                        </span>
                        {/* Three-dot menu toggler visible on hover (author only) */}
                        {isOwner && (
                          <button
                            onClick={() => toggleCommentMenu(comment.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 px-1"
                            aria-label="Comment options"
                            title="Options"
                          >
                            <FaEllipsisV />
                          </button>
                        )}
                      </p>
                      <p className="text-sm mt-1">{comment.text}</p>

                      {/* Dropdown menu for delete, only for author */}
                      {isOwner && commentMenus[comment.id] && (
                        <div className="absolute right-2 top-8 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                          <button
                            onClick={() => { setCommentMenus((prev)=>({ ...prev, [comment.id]: false })); handleDeleteComment(comment.id); }}
                            className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 gap-2 text-sm font-medium"
                          >
                            <FaTrash className="text-red-600" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Comment Actions */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <button
                        ref={(el) => commentLikeButtonRefs.current[comment.id] = el}
                        onClick={() => handleCommentLike(comment.id)}
                        className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                          likedComments[comment.id] ? 'text-red-500' : ''
                        }`}
                      >
                        <FaHeart className={likedComments[comment.id] ? 'fill-current' : ''} />
                        {likedComments[comment.id] ? 'Liked' : 'Like'}
                      </button>
                      
                      <button
                        onClick={() => toggleReplyInput(comment.id)}
                        className="hover:text-blue-500 transition-colors"
                      >
                        Reply
                      </button>
                      
                      {commentDetails[comment.id]?.replies?.length > 0 && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="hover:text-purple-500 transition-colors"
                        >
                          {showReplies[comment.id] ? 'Hide' : 'View'} {commentDetails[comment.id].replies.length} replies
                        </button>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyInputs[comment.id] && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={replyTexts[comment.id] || ''}
                          onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                          className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleReplyToComment(comment.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleReplyToComment(comment.id)}
                          disabled={!replyTexts[comment.id]?.trim()}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            replyTexts[comment.id]?.trim()
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Reply
                        </button>
                      </div>
                    )}

                    {/* Replies Display */}
                    {showReplies[comment.id] && commentDetails[comment.id]?.replies && (
                      <div className="mt-2 ml-4 space-y-2">
                        {commentDetails[comment.id].replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                              {reply.user?.name?.charAt(0) || 'R'}
                            </div>
                            <div className="flex-1">
                              <div className="bg-green-50 rounded-lg px-3 py-2">
                                <p className="text-xs">
                                  <span className="font-semibold">{reply.user?.name}</span> {reply.text}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <button
                                  ref={(el) => replyLikeButtonRefs.current[reply.id] = el}
                                  onClick={() => handleReplyLike(reply.id, comment.id)}
                                  className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                                    likedComments[reply.id] ? 'text-red-500' : ''
                                  }`}
                                >
                                  <FaHeart className={likedComments[reply.id] ? 'fill-current' : ''} />
                                  {likedComments[reply.id] ? 'Liked' : 'Like'}
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
            ))}
            
            {comments.length > 2 && (
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {showAllComments ? 'Show less' : `View all ${comments.length} comments`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contentType="post"
        contentData={postData || {
          id: postId,
          imageUrl: postImageSrc,
          videoUrl: postVideoSrc,
          caption: caption
        }}
      />

      {/* Heart Icon Popup for all interactions */}
      <HeartIconPopup heartButtonRef={postLikeButtonRef} />

    </div>
  );
};

export default SocialPost;
