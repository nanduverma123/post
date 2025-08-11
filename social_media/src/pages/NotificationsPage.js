import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { GET_USER_NOTIFICATIONS_SAFE, LIKE_COMMENT, REPLY_TO_COMMENT, DELETE_COMMENT, DELETE_REPLY, LIKE_REPLY, COMMENT_POST, GET_COMMENT_DETAILS } from '../graphql/mutations';
import { GetTokenFromCookie } from '../components/getToken/GetToken';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import FooterNav from '../components/footer/FooterNav';
import { Heart, MessageCircle, Trash2, Reply, MoreHorizontal, MoreVertical } from 'lucide-react';
import { FaBookmark } from 'react-icons/fa';
import CommentLikePopup from '../components/notifications/CommentLikePopup';
import ReplySuccessPopup from '../components/notifications/ReplySuccessPopup';
import ReplyNotificationPopup from '../components/notifications/ReplyNotificationPopup';
import { usePersistentLikes, usePersistentCommentDetails } from '../hooks/usePersistentData';
import { 
  addSharedReply, 
  getRepliesForComment, 
  addSharedNotification, 
  listenForSharedUpdates,
  toggleSharedCommentLike,
  isCommentLikedByUser,
  getSharedCommentLikes
} from '../utils/sharedStorage';
import HeartIconPopup from '../components/notifications/HeartIconPopup';
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications';

const NotificationsPage = () => {
  const [user, setUser] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [likedComments, setLikedComments] = usePersistentLikes(); // Track liked comments (persistent)
  const [showReplies, setShowReplies] = useState({}); // Track which comments show replies
  const [commentDetails, setCommentDetails] = usePersistentCommentDetails(); // Store comment details with replies (persistent)
  const [showCommentLikePopup, setShowCommentLikePopup] = useState(false);
  const [commentLikePopupData, setCommentLikePopupData] = useState({});
  const [showReplySuccessPopup, setShowReplySuccessPopup] = useState(false);
  const [replySuccessPopupData, setReplySuccessPopupData] = useState({});
  const [showReplyNotificationPopup, setShowReplyNotificationPopup] = useState(false);
  const [replyNotificationPopupData, setReplyNotificationPopupData] = useState({});
  const [notificationMenus, setNotificationMenus] = useState({});
  const { markAsRead, refreshUnreadCount, addNewNotification, cleanupOldNotifications, removeNotification } = useNotifications();
  const { addPopupNotification } = useRealTimeNotifications();
  const navigate = useNavigate();
  
  // Heart icon popup ref
  const heartButtonRef = useRef(null);
  
  // Shared comment likes state
  const [sharedCommentLikes, setSharedCommentLikes] = useState({});

  // GraphQL Mutations and Queries
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [replyToComment] = useMutation(REPLY_TO_COMMENT);
  const [deleteComment] = useMutation(DELETE_COMMENT);
  const [deleteReply] = useMutation(DELETE_REPLY);
  const [likeReply] = useMutation(LIKE_REPLY);
  const [commentPost] = useMutation(COMMENT_POST);
  const [getCommentDetails] = useLazyQuery(GET_COMMENT_DETAILS);

  // Helper function to find comment ID by matching comment text
  const findCommentIdByText = async (postId, commentText, senderName) => {
    try {
      // This would require a new GraphQL query to search comments by text
      // For now, we'll return null and handle it gracefully
      console.log('🔍 Attempting to find comment by text:', { postId, commentText, senderName });
      return null;
    } catch (error) {
      console.error('Error finding comment by text:', error);
      return null;
    }
  };

  // Function to handle incoming reply notifications
  const handleIncomingReplyNotification = (replyData) => {
    console.log('📨 Incoming reply notification:', replyData);
    
    setReplyNotificationPopupData({
      replyText: replyData.replyText,
      replierName: replyData.replierName,
      originalCommentText: replyData.originalCommentText
    });
    setShowReplyNotificationPopup(true);
  };

  useEffect(() => {
    const decodedUser = GetTokenFromCookie();
    setUser(decodedUser);
  }, []);

  // Cleanup old notifications when page loads
  useEffect(() => {
    cleanupOldNotifications();
  }, [cleanupOldNotifications]);

  // Close notification menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-menu')) {
        setNotificationMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load shared comment likes on mount
  useEffect(() => {
    const likes = getSharedCommentLikes();
    setSharedCommentLikes(likes);
  }, []);

  // Listen for shared updates (real-time simulation)
  useEffect(() => {
    const cleanup = listenForSharedUpdates(
      // On replies update
      (newSharedReplies) => {
        console.log('🔄 Received shared replies update:', newSharedReplies);
        
        // Update comment details with shared replies
        setCommentDetails(prev => {
          const updated = { ...prev };
          Object.keys(newSharedReplies).forEach(commentId => {
            updated[commentId] = {
              ...updated[commentId],
              replies: newSharedReplies[commentId]
            };
          });
          return updated;
        });
      },
      // On notifications update
      (newSharedNotifications) => {
        
        // Check for new reply notifications for current user
        const myNotifications = newSharedNotifications.filter(n => 
          n.type === 'reply' && 
          n.recipient?.id === user?.id && 
          !n.isRead
        );
        
        if (myNotifications.length > 0) {
          const latestReply = myNotifications[myNotifications.length - 1];
          console.log('📨 Showing reply notification for:', latestReply);
          
          // Show heart icon popup for reply
          addPopupNotification({
            id: Date.now(),
            type: 'reply',
            sender: latestReply.sender,
            message: `${latestReply.sender?.name || latestReply.sender?.username} replied to your comment`
          });
        }
      },
      // On comment likes update
      (newSharedCommentLikes) => {
        console.log('🔄 Received shared comment likes update:', newSharedCommentLikes);
        setSharedCommentLikes(newSharedCommentLikes);
        
        // Check for new comment likes for current user
        Object.values(newSharedCommentLikes).forEach(like => {
          if (like.userId !== user?.id) { // Someone else liked our comment
            // Show heart icon popup for comment like
            addPopupNotification({
              id: Date.now(),
              type: 'comment_like',
              sender: { name: like.userName, id: like.userId },
              message: `${like.userName} liked your comment`
            });
          }
        });
      }
    );

    return cleanup;
  }, [user?.id, addPopupNotification]);

  const { data: notificationsData, loading, error, refetch } = useQuery(
    GET_USER_NOTIFICATIONS_SAFE,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      pollInterval: 10000, // Reduced polling frequency
      fetchPolicy: 'network-only', // Force fresh data from network
      errorPolicy: 'all', // Don't fail completely on errors
      notifyOnNetworkStatusChange: false, // Prevent loading state changes during polling
      onCompleted: (data) => {
        // Mark notifications as read when page loads
        markAsRead();
      },
      onError: (error) => {
        console.error('Error fetching notifications:', error);
        // Don't immediately show error, let it retry
      },
    }
  );

  // Mark as read when component mounts and when data changes
  useEffect(() => {
    if (notificationsData?.getUserNotifications) {
      markAsRead();
      // Refresh unread count after marking as read
      setTimeout(() => refreshUnreadCount(), 500);
    }
  }, [notificationsData, markAsRead, refreshUnreadCount]);

  // Debug: Log notifications data when they change and detect new replies
  useEffect(() => {
    const notifications = notificationsData?.getUserNotifications || [];
    if (notifications.length > 0) {
      console.log('📋 Loaded notifications:', notifications);
      console.log('📋 First notification structure:', notifications[0]);
      
      // Check for new reply notifications
      const replyNotifications = notifications.filter(n => n.type === 'reply' && !n.isRead);
      if (replyNotifications.length > 0) {
        const latestReply = replyNotifications[0]; // Show popup for the latest reply
        if (latestReply.sender && latestReply.commentText) {
          handleIncomingReplyNotification({
            replyText: latestReply.message || latestReply.commentText,
            replierName: latestReply.sender.name || latestReply.sender.username,
            originalCommentText: latestReply.commentText
          });
        }
      }
    }
  }, [notificationsData]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'comment_like':
        return '👍';
      case 'reply':
        return '↩️';
      case 'reply_like':
        return '💜';
      case 'reel_like':
        return '🎬❤️';
      case 'reel_comment':
        return '🎬💬';
      case 'follow':
        return '👤';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = (notification) => {
    
    // Navigate based on notification type
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.sender.id}`);
    } else if (notification.post?.id || notification.reel?.id) {
      // For all post/reel-related notifications (like, comment, comment_like, reply, reply_like, reel_like, reel_comment)
      // Navigate to home page with state to scroll to specific post/reel
      navigate('/', { 
        state: { 
          scrollToPost: notification.post?.id || notification.reel?.id,
          highlightComment: notification.commentId ? true : false,
          commentId: notification.commentId,
          isReel: notification.type === 'reel_like' || notification.type === 'reel_comment'
        } 
      });
    } else {
      // Fallback to home page
      navigate('/');
    }
  };

  const getNotificationMessage = (notification) => {
    const senderName = notification.sender?.name || notification.sender?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'comment_like':
        return `${senderName} liked your comment`;
      case 'reply':
        return `${senderName} replied to your comment`;
      case 'reply_like':
        return `${senderName} liked your reply`;
      case 'reel_like':
        return `${senderName} liked your reel`;
      case 'reel_comment':
        return `${senderName} commented on your reel`;
      case 'follow':
        return `${senderName} started following you`;
      default:
        return notification.message || 'New notification';
    }
  };

  // Handler functions for comment interactions
  const handleLikeComment = async (notification) => {
    console.log('🔥 LIKE COMMENT CLICKED!');
    console.log('Full notification object:', notification);
    console.log('Comment by:', notification.sender?.name);
    console.log('Current user:', user);
    
    if (!user || !user.id) {
      console.error('❌ User not found or user.id is missing:', user);
      alert('Please log in again to like comments.');
      return;
    }
    
    const postId = notification.post?.id;
    const commentId = notification.commentId;
    
    console.log('PostId:', postId);
    console.log('CommentId:', commentId);
    console.log('UserId:', user.id);
    
    if (!postId || !commentId) {
      console.error('Missing data - PostId:', postId, 'CommentId:', commentId);
      alert(`Cannot find post or comment to like. Please refresh the page and try again.`);
      return;
    }
    
    // Check current like state from shared storage
    const isCurrentlyLiked = isCommentLikedByUser(commentId, user.id);
    
    try {
      console.log('🚀 Liking comment...');
      
      // Toggle like in shared storage (visible to all users)
      const newLikeState = toggleSharedCommentLike(commentId, user.id, user.name || user.username);
      
      // Also update local state
      setLikedComments(prev => ({
        ...prev,
        [commentId]: newLikeState
      }));
      
      // Backend call
      const variables = {
        userId: user.id,
        postId: postId,
        commentId: commentId
      };
      
      console.log('📤 Like comment variables:', variables);
      
      const result = await likeComment({
        variables: variables
      });
      
      console.log('✅ Comment liked successfully:', result);
      
      // Show heart icon popup when liking (not unliking)
      if (newLikeState) {
        addPopupNotification({
          id: Date.now(),
          type: 'comment_like',
          sender: {
            id: user.id,
            name: user.name || user.username,
            profileImage: user.profileImage
          },
          message: `You liked ${notification.sender?.name || notification.sender?.username}'s comment`
        });
        
        // Send notification to comment owner
        if (notification.sender?.id !== user.id) {
          addSharedNotification({
            id: Date.now(),
            type: 'comment_like',
            message: `${user.name || user.username} liked your comment`,
            sender: {
              id: user.id,
              name: user.name || user.username,
              username: user.username,
              profileImage: user.profileImage
            },
            recipient: notification.sender,
            commentText: notification.commentText,
            postId: postId,
            commentId: commentId,
            createdAt: new Date().toISOString(),
            isRead: false
          });
        }
      }
      
      // Refetch notifications to update the UI
      refetch();
    } catch (error) {
      console.error('❌ Error liking comment:', error);
      console.error('❌ Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        variables: { userId: user.id, postId, commentId }
      });
      
      // Revert the like state on error
      setLikedComments(prev => ({
        ...prev,
        [commentId]: isCurrentlyLiked
      }));
      
      // More specific error message
      let errorMessage = 'Failed to like comment';
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleReplyToComment = async (notification) => {
    console.log('💬 REPLY TO COMMENT CLICKED!');
    console.log('Full notification object:', notification);
    console.log('Current user:', user);
    
    if (!user || !user.id) {
      console.error('❌ User not found or user.id is missing:', user);
      alert('Please log in again to reply to comments.');
      return;
    }
    
    const reply = replyText[notification.id]?.trim();
    if (!reply) {
      alert('Please enter a reply message');
      return;
    }

    const postId = notification.post?.id;
    const commentId = notification.commentId;
    
    console.log('PostId:', postId);
    console.log('CommentId:', commentId);
    console.log('UserId:', user.id);
    
    if (!postId || !commentId) {
      console.error('Missing data - PostId:', postId, 'CommentId:', commentId);
      alert(`Cannot find post or comment to reply to. Please refresh the page and try again.`);
      return;
    }

    try {
      console.log('🚀 Sending reply to comment...');
      
      const variables = {
        userId: user.id,
        postId: postId,
        commentId: commentId,
        text: reply
      };
      
      console.log('📤 Reply variables:', variables);
      
      const result = await replyToComment({
        variables: variables
      });
      
      console.log('✅ Reply successful:', result);
      
      // Clear reply input and hide it
      setReplyText(prev => ({ ...prev, [notification.id]: '' }));
      setShowReplyInput(prev => ({ ...prev, [notification.id]: false }));
      
      // Show success popup instead of alert
      // Show heart icon popup for reply success
      addPopupNotification({
        id: Date.now(),
        type: 'reply',
        sender: {
          id: user.id,
          name: user.name || user.username,
          profileImage: user.profileImage
        },
        message: `You replied to ${notification.sender?.name || notification.sender?.username}'s comment`
      });
      
      console.log('🎉 Reply sent successfully with heart popup');
      
      // First, immediately add the reply to local state for instant display
      const newReply = {
        id: Date.now(),
        text: reply,
        user: {
          id: user.id,
          name: user.name || user.username,
          username: user.username,
          profileImage: user.profileImage
        },
        repliedAt: new Date().toISOString()
      };

      // Add reply to shared storage (visible to all users)
      console.log('💾 Adding reply to shared storage:', newReply);
      addSharedReply(commentId, newReply);

      // Update local comment details with new reply
      setCommentDetails(prev => {
        const updated = {
          ...prev,
          [commentId]: {
            ...prev[commentId],
            replies: [
              ...(prev[commentId]?.replies || []),
              newReply
            ]
          }
        };
        console.log('💾 Updated local comment details:', updated[commentId]);
        return updated;
      });

      // Auto-show replies after adding one
      setShowReplies(prev => ({ ...prev, [commentId]: true }));

      // Send notification to shared storage (visible to all users)
      try {
        console.log('📨 Sending reply notification to shared storage');
        
        const replyNotification = {
          id: Date.now() + Math.random(), // Ensure unique ID
          type: 'reply',
          message: `${user.name || user.username} replied to your comment`,
          sender: {
            id: user.id,
            name: user.name || user.username,
            username: user.username,
            profileImage: user.profileImage
          },
          recipient: notification.sender,
          commentText: notification.commentText,
          replyText: reply,
          postId: postId,
          commentId: commentId,
          createdAt: new Date().toISOString(),
          isRead: false
        };

        // Add to shared storage
        addSharedNotification(replyNotification);

        // Also add to local notification context
        addNewNotification(replyNotification);

        // Force show reply notification popup after 2 seconds for testing
        setTimeout(() => {
          setReplyNotificationPopupData({
            replyText: reply,
            replierName: user.name || user.username,
            originalCommentText: notification.commentText
          });
          setShowReplyNotificationPopup(true);
        }, 2000);

      } catch (error) {
        console.error('Error sending reply notification:', error);
      }

      // Fetch updated comment details from server
      if (postId && commentId) {
        try {
          const { data: commentData } = await getCommentDetails({
            variables: { postId, commentId }
          });
          
          if (commentData?.getCommentDetails) {
            setCommentDetails(prev => ({
              ...prev,
              [commentId]: commentData.getCommentDetails
            }));
          }
        } catch (error) {
          console.error('Error fetching updated comment details:', error);
        }
      }
      
      // Refetch notifications to update the UI
      refetch();
    } catch (error) {
      console.error('❌ Error replying to comment:', error);
      console.error('❌ Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        variables: { userId: user.id, postId, commentId, text: reply }
      });
      
      // Show detailed error
      let errorMessage = 'Failed to send reply';
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleDeleteComment = async (notification) => {
    console.log('🗑️ DELETE COMMENT CLICKED!');
    console.log('Comment by:', notification.sender?.name);
    console.log('Current user:', user?.name);
    
    // Check if current user is the comment owner
    if (notification.sender?.id !== user?.id) {
      alert('You can only delete your own comments!');
      return;
    }
    
    // For now, navigate to post where user can delete the comment normally
    const postId = notification.post?.id || notification.postId;
    
    if (!postId) {
      alert('Cannot find post to delete comment');
      return;
    }
    
    if (!window.confirm(`Navigate to post to delete your comment: "${notification.commentText}"?`)) return;
    
    // Navigate to the post
    alert(`Navigating to post to delete your comment...`);
    handleNotificationClick(notification);
  };

  const toggleReplyInput = (notificationId) => {
    setShowReplyInput(prev => ({
      ...prev,
      [notificationId]: !prev[notificationId]
    }));
  };

  const toggleRepliesView = async (notification) => {
    console.log('👁️ VIEW REPLIES CLICKED!');
    console.log('Full notification object:', notification);
    
    const commentId = notification.commentId;
    const postId = notification.post?.id;
    
    console.log('PostId:', postId);
    console.log('CommentId:', commentId);
    
    if (!commentId || !postId) {
      console.error('Missing data - PostId:', postId, 'CommentId:', commentId);
      alert(`Cannot view replies. Please refresh the page and try again.`);
      return;
    }

    const isCurrentlyShowing = showReplies[commentId];
    
    // Toggle the display state
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !isCurrentlyShowing
    }));

    // If we're showing replies and don't have the data yet, fetch it
    if (!isCurrentlyShowing && !commentDetails[commentId]) {
      try {
        console.log('Loading replies for comment:', commentId);
        
        // First, load shared replies
        const sharedReplies = getRepliesForComment(commentId);
        console.log('📥 Loaded shared replies:', sharedReplies);
        
        if (sharedReplies.length > 0) {
          setCommentDetails(prev => ({
            ...prev,
            [commentId]: {
              ...prev[commentId],
              replies: sharedReplies
            }
          }));
        }

        // Also try to fetch from server
        console.log('Fetching comment details from server for:', { postId, commentId });
        const { data } = await getCommentDetails({
          variables: { postId, commentId }
        });
        
        if (data?.getCommentDetails) {
          setCommentDetails(prev => ({
            ...prev,
            [commentId]: {
              ...data.getCommentDetails,
              // Merge server replies with shared replies
              replies: [
                ...(data.getCommentDetails.replies || []),
                ...sharedReplies.filter(sr => 
                  !data.getCommentDetails.replies?.some(dr => dr.id === sr.id)
                )
              ]
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching comment details:', error);
        
        // Fallback to shared replies only
        const sharedReplies = getRepliesForComment(commentId);
        if (sharedReplies.length > 0) {
          setCommentDetails(prev => ({
            ...prev,
            [commentId]: {
              ...prev[commentId],
              replies: sharedReplies
            }
          }));
        } else {
          // Revert the show state on error if no shared replies
          setShowReplies(prev => ({
            ...prev,
            [commentId]: false
          }));
        }
      }
    }
  };

  const handleReplyTextChange = (notificationId, text) => {
    setReplyText(prev => ({
      ...prev,
      [notificationId]: text
    }));
  };

  // Toggle notification menu
  const toggleNotificationMenu = (notificationId) => {
    setNotificationMenus(prev => ({ ...prev, [notificationId]: !prev[notificationId] }));
  };

  // Handle notification delete
  const handleDeleteNotification = (notification) => {
    console.log('🗑️ Deleting notification:', notification.id);
    removeNotification(notification.id);
    // Close the menu
    setNotificationMenus(prev => ({ ...prev, [notification.id]: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h1>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <FooterNav />
      </div>
    );
  }

  // Only show error if there's no cached data and it's a real error
  if (error && !notificationsData && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading notifications. Please try again.</p>
              <button 
                onClick={() => refetch()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <FooterNav />
      </div>
    );
  }

  const notifications = notificationsData?.getUserNotifications || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h1>
          


          {/* Show warning if there's an error but we have cached data */}
          {error && notificationsData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-700 text-sm">
                ⚠️ Connection issue detected. Showing cached notifications.
                <button 
                  onClick={() => refetch()}
                  className="ml-2 text-yellow-800 underline hover:no-underline"
                >
                  Retry
                </button>
              </p>
            </div>
          )}
          
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No notifications yet</h2>
              <p className="text-gray-500">When someone likes or comments on your posts, you'll see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative ${
                    !notification.isRead ? 'border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      {notification.sender?.profileImage ? (
                        <img
                          src={notification.sender.profileImage}
                          alt={notification.sender.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {notification.sender?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium">
                            {getNotificationMessage(notification)}
                          </p>
                        </div>
                        
                        {/* Three-dot menu - appears on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity notification-menu ml-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleNotificationMenu(notification.id);
                            }}
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {/* Dropdown menu */}
                          {notificationMenus[notification.id] && (
                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteNotification(notification);
                                }}
                                className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 gap-2 text-sm font-medium"
                              >
                                <Trash2 className="text-red-600" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                          
                          {/* Comment text if available */}
                          {notification.commentText && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                              <p className="text-gray-700 text-sm italic">
                                "{notification.commentText}"
                              </p>
                            </div>
                          )}
                          
                          <p className="text-gray-500 text-sm mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>

                          {/* Interactive buttons for comment notifications */}
                          {(notification.type === 'comment' || notification.type === 'comment_like' || notification.commentText) && notification.post?.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-3">
                                {/* Like Comment Button - Only show if commentId exists */}
                                {notification.commentId && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Like button clicked!');
                                      handleLikeComment(notification);
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                                      likedComments[notification.commentId] 
                                        ? 'bg-red-100 border-2 border-red-400 text-red-700 hover:bg-red-200' 
                                        : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                                    }`}
                                    title={`${likedComments[notification.commentId] ? 'Unlike' : 'Like'} ${notification.sender?.name}'s comment`}
                                    type="button"
                                  >
                                    <Heart 
                                      className={`w-5 h-5 ${likedComments[notification.commentId] ? 'fill-current' : ''}`} 
                                    />
                                    <span className="text-sm font-bold">
                                      {likedComments[notification.commentId] ? '❤️ Liked' : '🤍 Like Comment'}
                                    </span>
                                  </button>
                                )}

                                {/* Reply Button - Only show if commentId exists */}
                                {notification.commentId && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Reply button clicked!');
                                      toggleReplyInput(notification.id);
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                    title={`Reply to ${notification.sender?.name}`}
                                    type="button"
                                  >
                                    <Reply className="w-5 h-5" />
                                    <span className="text-sm font-bold">💬 Reply to Comment</span>
                                  </button>
                                )}

                                {/* Delete Button (only if current user made the comment and commentId exists) */}
                                {notification.sender?.id === user?.id && notification.commentId && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Delete button clicked!');
                                      handleDeleteComment(notification);
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-50 border-2 border-red-200 rounded-lg text-red-600 hover:bg-red-100 hover:border-red-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                    title="Delete your comment"
                                    type="button"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="text-sm font-bold">🗑️ Delete Comment</span>
                                  </button>
                                )}

                                {/* View Replies Button - Only show if commentId exists */}
                                {notification.commentId && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('View Replies button clicked!');
                                      toggleRepliesView(notification);
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg text-green-600 hover:bg-green-100 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                    title="View replies to this comment"
                                    type="button"
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                    <span className="text-sm font-bold">
                                      {showReplies[notification.commentId] ? '🔼 Hide Replies' : '💬 View Replies'}
                                    </span>
                                  </button>
                                )}

                                {/* Message for notifications without commentId */}
                                {!notification.commentId && (
                                  <div className="text-center py-2">
                                    <p className="text-xs text-gray-500 italic">
                                      💡 Click on this notification to view the post
                                    </p>
                                  </div>
                                )}

                              </div>
                            </div>
                          )}

                          {/* Replies Display */}
                          {showReplies[notification.commentId] && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="text-sm font-semibold text-green-700 mb-2">
                                💬 Replies to this comment:
                              </h4>
                              <div className="space-y-2">
                                {(() => {
                                  console.log('🔍 Checking replies for commentId:', notification.commentId);
                                  console.log('🔍 Comment details:', commentDetails[notification.commentId]);
                                  console.log('🔍 Replies array:', commentDetails[notification.commentId]?.replies);
                                  return null;
                                })()}
                                {commentDetails[notification.commentId]?.replies?.length > 0 ? (
                                  commentDetails[notification.commentId].replies.map((reply) => (
                                    <div key={reply.id} className="bg-white p-3 rounded border-l-4 border-green-300">
                                      <div className="flex items-start space-x-2">
                                        {reply.user?.profileImage ? (
                                          <img
                                            src={reply.user.profileImage}
                                            alt={reply.user.name}
                                            className="w-6 h-6 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                            {reply.user?.name?.charAt(0) || '?'}
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm">
                                            <strong>{reply.user?.name || reply.user?.username}:</strong> {reply.text}
                                          </p>
                                          <div className="flex items-center space-x-2 mt-1">
                                            <p className="text-xs text-gray-500">
                                              {formatTimeAgo(reply.repliedAt)}
                                            </p>
                                            <span className="text-xs text-gray-400">•</span>
                                            <p className="text-xs text-gray-500">
                                              {reply.likes?.length || 0} likes
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="bg-white p-3 rounded border-l-4 border-gray-300">
                                    <p className="text-sm text-gray-500 italic">
                                      No replies yet. Be the first to reply!
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Reply Input */}
                          {showReplyInput[notification.id] && (
                            <div 
                              className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-0.5 bg-blue-300 mr-2"></div>
                                <p className="text-sm text-blue-700 font-medium">
                                  Replying to <strong>{notification.sender?.name}</strong>
                                </p>
                                <div className="flex-1 h-0.5 bg-blue-300 ml-2"></div>
                              </div>
                              <div className="flex space-x-3">
                                <input
                                  type="text"
                                  placeholder={`Reply to ${notification.sender?.name}...`}
                                  value={replyText[notification.id] || ''}
                                  onChange={(e) => handleReplyTextChange(notification.id, e.target.value)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleReplyToComment(notification);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleReplyToComment(notification);
                                  }}
                                  disabled={!replyText[notification.id]?.trim()}
                                  className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                                >
                                  Send Reply
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowReplyInput(prev => ({ ...prev, [notification.id]: false }));
                                  }}
                                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium transition-colors shadow-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notification Icon */}
                        <div className="flex-shrink-0 ml-3">
                          <span className="text-2xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                      </div>

                      {/* Post thumbnail if available */}
                      {notification.post && (notification.post.imageUrl || notification.post.videoUrl) && (
                        <div className="mt-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                            {notification.post.imageUrl ? (
                              <img
                                src={notification.post.imageUrl}
                                alt="Post"
                                className="w-full h-full object-cover"
                              />
                            ) : notification.post.thumbnailUrl ? (
                              <img
                                src={notification.post.thumbnailUrl}
                                alt="Video thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">Video</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <FooterNav />
      
      {/* Heart Icon Popup */}
      <HeartIconPopup heartButtonRef={heartButtonRef} />
      
      {/* Comment Like Popup */}
      <CommentLikePopup
        isVisible={showCommentLikePopup}
        onClose={() => setShowCommentLikePopup(false)}
        commentText={commentLikePopupData.commentText}
        postOwner={commentLikePopupData.postOwner}
      />
      
      {/* Reply Success Popup */}
      {(() => {
        console.log('🎭 Reply Success Popup render check:', {
          isVisible: showReplySuccessPopup,
          data: replySuccessPopupData
        });
        return null;
      })()}
      <ReplySuccessPopup
        isVisible={showReplySuccessPopup}
        onClose={() => {
          console.log('🎭 Closing reply success popup');
          setShowReplySuccessPopup(false);
        }}
        replyText={replySuccessPopupData.replyText}
        recipientName={replySuccessPopupData.recipientName}
      />
      
      {/* Reply Notification Popup */}
      <ReplyNotificationPopup
        isVisible={showReplyNotificationPopup}
        onClose={() => setShowReplyNotificationPopup(false)}
        replyText={replyNotificationPopupData.replyText}
        replierName={replyNotificationPopupData.replierName}
        originalCommentText={replyNotificationPopupData.originalCommentText}
      />
    </div>
  );
};

export default NotificationsPage;