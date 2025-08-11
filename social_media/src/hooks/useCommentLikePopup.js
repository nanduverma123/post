import { useState } from 'react';

export const useCommentLikePopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({});

  const showCommentLikePopup = (commentText, postOwner) => {
    setPopupData({
      commentText: commentText || 'Comment',
      postOwner: postOwner || 'user'
    });
    setShowPopup(true);
  };

  const hideCommentLikePopup = () => {
    setShowPopup(false);
    setPopupData({});
  };

  return {
    showPopup,
    popupData,
    showCommentLikePopup,
    hideCommentLikePopup
  };
};

export default useCommentLikePopup;