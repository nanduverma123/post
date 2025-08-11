import { useNotifications } from '../context/NotificationContext';

// Helper function to add reel like notification
export const addReelLikeNotification = (reelOwnerId, likerUser, reelId, reelTitle = '', addNewNotification) => {
  const notification = {
    id: `reel_like_${Date.now()}_${Math.random()}`,
    type: 'reel_like',
    sender: {
      id: likerUser.id,
      name: likerUser.name || likerUser.username,
      username: likerUser.username,
      profileImage: likerUser.profileImage
    },
    recipient: {
      id: reelOwnerId
    },
    reel: {
      id: reelId,
      title: reelTitle
    },
    createdAt: new Date().toISOString(),
    isRead: false
  };
  
  if (addNewNotification) {
    addNewNotification(notification);
    console.log('🎬 Added reel like notification:', notification);
  }
};

// Helper function to add reel comment notification
export const addReelCommentNotification = (reelOwnerId, commenterUser, reelId, commentText, commentId, reelTitle = '', addNewNotification) => {
  const notification = {
    id: `reel_comment_${Date.now()}_${Math.random()}`,
    type: 'reel_comment',
    sender: {
      id: commenterUser.id,
      name: commenterUser.name || commenterUser.username,
      username: commenterUser.username,
      profileImage: commenterUser.profileImage
    },
    recipient: {
      id: reelOwnerId
    },
    reel: {
      id: reelId,
      title: reelTitle
    },
    commentId: commentId,
    commentText: commentText,
    createdAt: new Date().toISOString(),
    isRead: false
  };
  
  if (addNewNotification) {
    addNewNotification(notification);
    console.log('🎬 Added reel comment notification:', notification);
  }
};

// Hook to use reel notifications
export const useReelNotifications = () => {
  const { addNewNotification } = useNotifications();
  
  const addReelLikeNotification = (reelOwnerId, likerUser, reelId, reelTitle = '') => {
    const notification = {
      id: `reel_like_${Date.now()}_${Math.random()}`,
      type: 'reel_like',
      sender: {
        id: likerUser.id,
        name: likerUser.name || likerUser.username,
        username: likerUser.username,
        profileImage: likerUser.profileImage
      },
      recipient: {
        id: reelOwnerId
      },
      reel: {
        id: reelId,
        title: reelTitle
      },
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    addNewNotification(notification);
    console.log('🎬 Added reel like notification:', notification);
  };
  
  const addReelCommentNotification = (reelOwnerId, commenterUser, reelId, commentText, commentId, reelTitle = '') => {
    const notification = {
      id: `reel_comment_${Date.now()}_${Math.random()}`,
      type: 'reel_comment',
      sender: {
        id: commenterUser.id,
        name: commenterUser.name || commenterUser.username,
        username: commenterUser.username,
        profileImage: commenterUser.profileImage
      },
      recipient: {
        id: reelOwnerId
      },
      reel: {
        id: reelId,
        title: reelTitle
      },
      commentId: commentId,
      commentText: commentText,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    addNewNotification(notification);
    console.log('🎬 Added reel comment notification:', notification);
  };
  
  return {
    addReelLikeNotification,
    addReelCommentNotification
  };
};
