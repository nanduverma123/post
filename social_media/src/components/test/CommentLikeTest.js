import React, { useState } from 'react';
import CommentLikePopup from '../notifications/CommentLikePopup';

const CommentLikeTest = () => {
  const [showPopup, setShowPopup] = useState(false);

  const testPopup = () => {
    setShowPopup(true);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Comment Like Popup Test</h2>
      <button
        onClick={testPopup}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Comment Like Popup
      </button>

      <CommentLikePopup
        isVisible={showPopup}
        onClose={() => setShowPopup(false)}
        commentText="This is a test comment to see how the popup looks!"
        postOwner="John Doe"
      />
    </div>
  );
};

export default CommentLikeTest;