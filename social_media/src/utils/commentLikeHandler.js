import { useMutation } from '@apollo/client';
import { LIKE_COMMENT } from '../graphql/mutations';

export const useCommentLikeHandler = (showPopupCallback) => {
  const [likeCommentMutation] = useMutation(LIKE_COMMENT);

  const handleCommentLike = async (userId, postId, commentId, commentText = '', postOwner = '') => {
    try {
      console.log('🚀 Liking comment...', { userId, postId, commentId });
      
      const result = await likeCommentMutation({
        variables: {
          userId,
          postId,
          commentId
        }
      });
      
      console.log('✅ Comment liked successfully:', result);
      
      // Show popup notification
      if (showPopupCallback) {
        showPopupCallback(commentText, postOwner);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error liking comment:', error);
      throw error;
    }
  };

  return { handleCommentLike };
};

export default useCommentLikeHandler;