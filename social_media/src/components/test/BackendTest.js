import React, { useState } from 'react';
import axios from 'axios';
import { GetTokenFromCookie } from '../getToken/GetToken';

const BackendTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testLikePost = async () => {
    setLoading(true);
    try {
      const user = GetTokenFromCookie();
      if (!user?.id) {
        addResult('No user token found', 'error');
        return;
      }

      // Test liking a post (you'll need to replace with actual post ID)
      const query = `
        mutation LikePost($userId: ID!, $postId: ID!) {
          LikePost(userId: $userId, postId: $postId)
        }
      `;
      
      const variables = {
        userId: user.id,
        postId: "test-post-id" // Replace with actual post ID
      };

      const response = await axios.post("http://localhost:5000/graphql", {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        addResult(`Like error: ${response.data.errors[0].message}`, 'error');
      } else {
        addResult('Like successful - should trigger notification', 'success');
      }
    } catch (error) {
      addResult(`Like request failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testFollowUser = async () => {
    setLoading(true);
    try {
      const user = GetTokenFromCookie();
      if (!user?.id) {
        addResult('No user token found', 'error');
        return;
      }

      const query = `
        mutation FollowAndUnfollow($id: ID!) {
          followAndUnfollow(id: $id) {
            id
            name
            followers {
              id
            }
          }
        }
      `;
      
      const variables = {
        id: "test-user-id" // Replace with actual user ID
      };

      const response = await axios.post("http://localhost:5000/graphql", {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        addResult(`Follow error: ${response.data.errors[0].message}`, 'error');
      } else {
        addResult('Follow successful - should trigger notification', 'success');
      }
    } catch (error) {
      addResult(`Follow request failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testCommentOnPost = async () => {
    setLoading(true);
    try {
      const user = GetTokenFromCookie();
      if (!user?.id) {
        addResult('No user token found', 'error');
        return;
      }

      const query = `
        mutation CommentPost($postId: ID!, $text: String!) {
          commentPost(postId: $postId, text: $text) {
            id
            text
            user {
              id
              name
            }
          }
        }
      `;
      
      const variables = {
        postId: "test-post-id", // Replace with actual post ID
        text: "This is a test comment from frontend"
      };

      const response = await axios.post("http://localhost:5000/graphql", {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        addResult(`Comment error: ${response.data.errors[0].message}`, 'error');
      } else {
        addResult('Comment successful - should trigger notification', 'success');
      }
    } catch (error) {
      addResult(`Comment request failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testSocketConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/health');
      addResult(`Server health: ${response.status === 200 ? 'OK' : 'Error'}`, response.status === 200 ? 'success' : 'error');
    } catch (error) {
      addResult(`Server connection failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border max-w-md">
      <h3 className="text-sm font-semibold mb-3 text-gray-800">Backend Tests</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testSocketConnection}
          disabled={loading}
          className="w-full px-3 py-2 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Test Server Connection
        </button>
        <button
          onClick={testLikePost}
          disabled={loading}
          className="w-full px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Test Like Post
        </button>
        <button
          onClick={testFollowUser}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          Test Follow User
        </button>
        <button
          onClick={testCommentOnPost}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          Test Comment
        </button>
        <button
          onClick={clearResults}
          className="w-full px-3 py-2 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors"
        >
          Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="max-h-40 overflow-y-auto">
          <h4 className="text-xs font-semibold mb-2 text-gray-700">Results:</h4>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`text-xs p-2 mb-1 rounded ${
                result.type === 'success' ? 'bg-green-100 text-green-800' :
                result.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              <span className="font-mono text-xs text-gray-500">{result.timestamp}</span>
              <br />
              {result.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackendTest;