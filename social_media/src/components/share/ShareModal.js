import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSearch, FaPaperPlane } from 'react-icons/fa';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_USERS, SEND_MESSAGE } from '../../graphql/mutations';
import { GetTokenFromCookie } from '../getToken/GetToken';
import { useChat } from '../../context/ChatContext';
import socket from '../socket_io/Socket';

const ShareModal = ({ isOpen, onClose, contentType, contentData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [user, setUser] = useState(null);
  const { updateChatOrder } = useChat();



  useEffect(() => {
    try {
      const decodedUser = GetTokenFromCookie();
      setUser(decodedUser);
    } catch (error) {
      console.error('Error getting user token:', error);
    }
  }, []);

  const { data: usersData, loading } = useQuery(GET_ALL_USERS, {
    skip: !isOpen,
  });

  const [sendMessage] = useMutation(SEND_MESSAGE);

  // Filter users based on search term
  const filteredUsers = usersData?.users?.filter(u => 
    u.id !== user?.id && // Exclude current user
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleUserSelect = (selectedUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };



  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    try {
      // Create share message based on content type
      let shareData = {};
      const customMessage = `${user?.name} shared a ${contentType} with you`;

      if (contentType === 'post') {
        shareData = {
          type: 'shared_post',
          postId: contentData.id,
          postImage: contentData.imageUrl || contentData.videoUrl,
          postCaption: contentData.caption,
          sharedBy: user?.name,
          sharedAt: new Date().toISOString(),
          customMessage: customMessage
        };
      } else if (contentType === 'reel') {
        shareData = {
          type: 'shared_reel',
          reelId: contentData.id,
          reelVideo: contentData.videoUrl,
          reelTitle: contentData.title,
          sharedBy: user?.name,
          sharedAt: new Date().toISOString(),
          customMessage: customMessage
        };
      }

      // Send share message to each selected user with animation
      for (const selectedUser of selectedUsers) {
        try {
          await sendMessage({
            variables: {
              senderId: user.id,
              receiverId: selectedUser.id,
              message: JSON.stringify(shareData),
              media: null
            }
          });
          
          // Update chat order to move this user to top of sender's chat list
          updateChatOrder(selectedUser.id);
          
          // Emit socket event to notify receiver to move sender to top of their chat list
          socket.emit('updateChatOrder', {
            receiverId: selectedUser.id,
            senderId: user.id,
            senderName: user.name,
            contentType: contentType,
            timestamp: Date.now()
          });
          
          console.log('✅ Content shared successfully with:', selectedUser.name);
          console.log('📡 Socket event sent to update receiver chat order');
        } catch (error) {
          console.error('❌ Error sharing with', selectedUser.name, ':', error);
        }
      }

      // Send notification to each receiver via socket
      for (const selectedUser of selectedUsers) {
        socket.emit('shareNotification', {
          receiverId: selectedUser.id,
          senderName: user.name,
          senderProfileImage: user.profileImage,
          contentType: contentType,
          message: `${user.name} shared a ${contentType} with you`,
          timestamp: Date.now()
        });
      }
      
      console.log(`✅ Share notifications sent to ${selectedUsers.length} user(s)`);
      
      // Simple success message for sender (less intrusive)
      const toast = document.createElement('div');
      toast.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          animation: slideIn 0.3s ease-out;
        ">
          Shared successfully! ✓
        </div>
        <style>
          @keyframes slideIn {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
        </style>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 2000);
      
      // Reset and close
      setSelectedUsers([]);
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error sharing content:', error);
      alert('Failed to share content. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              Share {contentType === 'post' ? 'Post' : 'Reel'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>

          {/* Header for Users List */}
          <div className="px-4 py-3 bg-purple-50 border-b">
            <h3 className="text-sm font-medium text-purple-800">Select users to share with</h3>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>



              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="p-4 border-b">
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{user.name}</span>
                        <button
                          onClick={() => handleUserSelect(user)}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(user => {
                      const isSelected = selectedUsers.find(u => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-purple-50 border-2 border-purple-200' 
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <img
                            src={user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <button
              onClick={handleShare}
              disabled={selectedUsers.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedUsers.length > 0
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FaPaperPlane />
              Share with {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;