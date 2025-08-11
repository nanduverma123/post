import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import FollowPopup from './FollowPopup';
import CommentPopup from './CommentPopup';
import CommentLikePopup from './CommentLikePopup';
import ReplyNotificationPopup from './ReplyNotificationPopup';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import { useMutation } from '@apollo/client';
import { FOLLOW_AND_UNFOLLOW, LIKE_COMMENT, COMMENT_POST } from '../../graphql/mutations';

const NotificationManager = () => {
  const { newNotifications, removeNotification, clearAllNotifications } = useNotifications();
  const [displayedNotifications, setDisplayedNotifications] = useState([]);
  const [followPopup, setFollowPopup] = useState(null);
  const [commentPopup, setCommentPopup] = useState(null);
  const [commentLikePopup, setCommentLikePopup] = useState({ isVisible: false, data: {} });
  const [replyNotificationPopup, setReplyNotificationPopup] = useState({ isVisible: false, data: {} });

  // Initialize real-time notifications
  useRealTimeNotifications();

  // Mutations for interactive actions
  const [followUser] = useMutation(FOLLOW_AND_UNFOLLOW);
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [commentOnPost] = useMutation(COMMENT_POST);

  // Update displayed notifications when new ones arrive
  useEffect(() => {
    if (newNotifications.length > 0) {
      // Get the latest notification
      const latestNotification = newNotifications[newNotifications.length - 1];
      
      // Separate different types of notifications for specialized popups
      const followNotifications = newNotifications.filter(n => n.type === 'follow');
      const commentNotifications = newNotifications.filter(n => n.type === 'comment');
      const replyNotifications = newNotifications.filter(n => n.type === 'reply');
      const reelLikeNotifications = newNotifications.filter(n => n.type === 'reel_like');
      const reelCommentNotifications = newNotifications.filter(n => n.type === 'reel_comment');

      // Show follow popup for the latest follow notification
      if (followNotifications.length > 0) {
        const latestFollow = followNotifications[followNotifications.length - 1];
        setFollowPopup(latestFollow);
      }

      // Show comment popup for the latest comment notification
      if (commentNotifications.length > 0) {
        const latestComment = commentNotifications[commentNotifications.length - 1];
        setCommentPopup(latestComment);
      }

      // Show reply notification popup for the latest reply
      if (replyNotifications.length > 0) {
        const latestReply = replyNotifications[replyNotifications.length - 1];
        setReplyNotificationPopup({
          isVisible: true,
          data: {
            replyText: latestReply.message || latestReply.commentText,
            replierName: latestReply.sender?.name || latestReply.sender?.username,
            originalCommentText: latestReply.commentText
          }
        });
      }

      // Show reel like notification popup for the latest reel like
      if (reelLikeNotifications.length > 0) {
        const latestReelLike = reelLikeNotifications[reelLikeNotifications.length - 1];
        setCommentLikePopup({
          isVisible: true,
          data: {
            commentText: `liked your reel`,
            postOwner: latestReelLike.sender?.name || latestReelLike.sender?.username,
            sender: latestReelLike.sender
          }
        });
      }

      // Show reel comment notification popup for the latest reel comment
      if (reelCommentNotifications.length > 0) {
        const latestReelComment = reelCommentNotifications[reelCommentNotifications.length - 1];
        setCommentPopup(latestReelComment);
      }
    }
  }, [newNotifications]);

  const handleNotificationClick = (notification) => {
    // Remove the clicked notification
    removeNotification(notification.id);
    setDisplayedNotifications(prev => prev.filter(n => n.id !== notification.id));
  };

  const handleClose = (notificationId) => {
    if (notificationId) {
      // Close specific notification
      removeNotification(notificationId);
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    } else {
      // Close all notifications
      clearAllNotifications();
      setDisplayedNotifications([]);
    }
  };



  // Handler for follow back action
  const handleFollowBack = async (userId) => {
    try {
      await followUser({
        variables: { id: userId }
      });
      console.log('✅ Successfully followed back user:', userId);
    } catch (error) {
      console.error('❌ Error following back user:', error);
      throw error;
    }
  };

  // Handler for liking a comment
  const handleLikeComment = async (commentId, commentText = '', postOwner = '') => {
    try {
      await likeComment({
        variables: { commentId }
      });
      console.log('✅ Successfully liked comment:', commentId);
      
      // Show comment like popup
      setCommentLikePopup({
        isVisible: true,
        data: {
          commentText: commentText,
          postOwner: postOwner
        }
      });
    } catch (error) {
      console.error('❌ Error liking comment:', error);
      throw error;
    }
  };

  // Handler for replying to a comment
  const handleReplyToComment = async (postId, replyText) => {
    try {
      await commentOnPost({
        variables: { 
          postId, 
          text: replyText 
        }
      });
      console.log('✅ Successfully replied to comment');
    } catch (error) {
      console.error('❌ Error replying to comment:', error);
      throw error;
    }
  };

  // Render notification popups (Instagram popup removed)
  return (
    <>
      {/* Follow popup (if needed) */}
      {followPopup && (
        <FollowPopup
          notification={followPopup}
          onClose={() => setFollowPopup(null)}
          onFollowBack={handleFollowBack}
        />
      )}
      
      {/* Comment popup (if needed) */}
      {commentPopup && (
        <CommentPopup
          notification={commentPopup}
          onClose={() => setCommentPopup(null)}
          onLike={handleLikeComment}
          onReply={handleReplyToComment}
        />
      )}
      
      {/* Comment Like popup */}
      <CommentLikePopup
        isVisible={commentLikePopup.isVisible}
        onClose={() => setCommentLikePopup({ isVisible: false, data: {} })}
        commentText={commentLikePopup.data.commentText}
        postOwner={commentLikePopup.data.postOwner}
      />
      
      {/* Reply Notification popup */}
      <ReplyNotificationPopup
        isVisible={replyNotificationPopup.isVisible}
        onClose={() => setReplyNotificationPopup({ isVisible: false, data: {} })}
        replyText={replyNotificationPopup.data.replyText}
        replierName={replyNotificationPopup.data.replierName}
        originalCommentText={replyNotificationPopup.data.originalCommentText}
      />
    </>
  );
};

export default NotificationManager;