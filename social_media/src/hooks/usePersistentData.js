import { useState, useEffect } from 'react';

export const usePersistentData = (key, initialValue = {}) => {
  // Get data from localStorage on initialization
  const [data, setData] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, data]);

  return [data, setData];
};

// Specific hooks for different data types
export const usePersistentLikes = () => {
  return usePersistentData('socialApp_likedComments', {});
};

export const usePersistentReplies = () => {
  return usePersistentData('socialApp_commentReplies', {});
};

export const usePersistentCommentDetails = () => {
  return usePersistentData('socialApp_commentDetails', {});
};

export default usePersistentData;