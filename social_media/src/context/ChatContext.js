import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatOrder, setChatOrder] = useState({}); // Track last interaction time for each user

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // Function to update chat order when sharing content
  const updateChatOrder = (userId) => {
    setChatOrder(prev => ({
      ...prev,
      [userId]: Date.now()
    }));
  };

  const value = {
    isAnimating,
    triggerAnimation,
    selectedChat,
    setSelectedChat,
    chatOrder,
    updateChatOrder
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 