import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import io from 'socket.io-client';
import { GetTokenFromCookie } from '../getToken/GetToken';

const NotificationTest = () => {
  const { addNewNotification } = useNotifications();
  const socketRef = useRef(null);

  useEffect(() => {
    // Test socket connection
    const user = GetTokenFromCookie();
    if (user?.id) {
      const userIdString = typeof user.id === 'object' && user.id.data 
        ? Buffer.from(user.id.data).toString('hex') 
        : user.id.toString();

      console.log('🧪 Testing socket connection with userId:', userIdString);
      
      socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        query: { userId: userIdString },
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Test socket connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Test socket disconnected');
      });

      socketRef.current.on('newNotification', (notification) => {
        console.log('🔔 Test socket received notification:', notification);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, []);

  const testFollowNotification = () => {
    const mockNotification = {
      id: `test-follow-${Date.now()}`,
      type: 'follow',
      sender: {
        id: 'test-user-1',
        name: 'John Doe',
        username: 'johndoe',
        profileImage: 'https://ui-avatars.com/api/?name=John+Doe&background=random'
      },
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    addNewNotification(mockNotification);
  };

  const testCommentNotification = () => {
    const mockNotification = {
      id: `test-comment-${Date.now()}`,
      type: 'comment',
      sender: {
        id: 'test-user-2',
        name: 'Jane Smith',
        username: 'janesmith',
        profileImage: 'https://ui-avatars.com/api/?name=Jane+Smith&background=random'
      },
      text: 'This is a test comment notification!',
      commentText: 'This is a test comment notification!',
      post: {
        id: 'test-post-1',
        imageUrl: 'https://picsum.photos/200/200',
        caption: 'Test post caption'
      },
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    addNewNotification(mockNotification);
  };

  const testLikeNotification = () => {
    const mockNotification = {
      id: `test-like-${Date.now()}`,
      type: 'like',
      sender: {
        id: 'test-user-3',
        name: 'Mike Johnson',
        username: 'mikejohnson',
        profileImage: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=random'
      },
      post: {
        id: 'test-post-2',
        imageUrl: 'https://picsum.photos/200/201',
        caption: 'Another test post'
      },
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    addNewNotification(mockNotification);
  };

  const testSocketEmission = () => {
    if (socketRef.current && socketRef.current.connected) {
      const testNotification = {
        id: `socket-test-${Date.now()}`,
        type: 'follow',
        sender: {
          id: 'socket-test-user',
          name: 'Socket Test User',
          username: 'sockettest',
          profileImage: 'https://ui-avatars.com/api/?name=Socket+Test&background=random'
        },
        createdAt: new Date().toISOString(),
        isRead: false
      };
      
      console.log('🧪 Emitting test notification via socket:', testNotification);
      socketRef.current.emit('testNotification', testNotification);
    } else {
      console.log('❌ Socket not connected');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg border">
      <h3 className="text-sm font-semibold mb-3 text-gray-800">Test Notifications</h3>
      <div className="space-y-2">
        <button
          onClick={testFollowNotification}
          className="w-full px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
        >
          Test Follow
        </button>
        <button
          onClick={testCommentNotification}
          className="w-full px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          Test Comment
        </button>
        <button
          onClick={testLikeNotification}
          className="w-full px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
        >
          Test Like
        </button>
        <button
          onClick={testSocketEmission}
          className="w-full px-3 py-2 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
        >
          Test Socket
        </button>
      </div>
    </div>
  );
};

export default NotificationTest;