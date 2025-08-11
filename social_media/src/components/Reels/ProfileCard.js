import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { FOLLOW_AND_UNFOLLOW, GET_ALL_POSTS, GET_USER_VIDEOS } from '../../graphql/mutations';
import { GetTokenFromCookie } from '../getToken/GetToken';
import axios from 'axios';

const ProfileCard = ({ user, isOpen, onClose }) => {
  
  const [tokens, setTokens] = useState();
  const [isFollowing, setIsFollowing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userVideos, setUserVideos] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0: Posts, 1: Reels
  const [isLoading, setIsLoading] = useState(true);

  // Mutations
  const [followUser] = useMutation(FOLLOW_AND_UNFOLLOW);

  useEffect(() => {
    const decodedUser = GetTokenFromCookie();
    setTokens(decodedUser);
  }, []);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user?.id || !tokens?.token) {
      console.log('Missing user ID or token for fetchUserProfile:', { userId: user?.id, hasToken: !!tokens?.token });
      return;
    }
    
    try {
      const query = `
        query getUserInformation($id: ID!) {
          getUserInformation(id: $id) {
            id
            name
            username
            bio
            profileImage
            isOnline
            lastActive
            followers { id }
            following { id }
            posts { id }
          }
        }
      `;
      
      const variables = { id: user.id.toString() };
      console.log('Fetching profile for user ID:', user.id);
      
      const response = await axios.post("http://localhost:5000/graphql", {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.token}`,
        },
        withCredentials: true,
      });

      const userData = response?.data?.data?.getUserInformation;
      console.log('API Response Data:', userData);
      if (userData) {
        setUserProfile(prev => ({
          ...prev,
          id: userData.id,
          name: userData.name || prev.name,
          username: userData.username || prev.username,
          avatar: userData.profileImage || prev.avatar,
          bio: userData.bio || prev.bio,
          stats: {
            followers: userData.followers?.length || 0,
            following: userData.following?.length || 0,
            posts: userData.posts?.length || 0,
          },
        }));

        // Check if current user is following this user
        const isCurrentlyFollowing = userData.followers?.some(follower => 
          follower.id?.toString() === tokens.id
        );
        setIsFollowing(isCurrentlyFollowing);
        console.log('ProfileCard - Following status from API:', isCurrentlyFollowing);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Keep the existing profile data if API call fails
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user posts
  const { data: postsData } = useQuery(GET_ALL_POSTS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  // Fetch user videos
  const { data: videosData } = useQuery(GET_USER_VIDEOS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  useEffect(() => {
    if (isOpen && user) {
      console.log('ProfileCard - User data received:', user);
      
      // Check if current user is following this user
      if (user.followers && tokens?.id) {
        const isUserFollowing = user.followers.some(follower => 
          follower.id?.toString() === tokens.id
        );
        setIsFollowing(isUserFollowing);
        console.log('ProfileCard - Initial following status:', isUserFollowing);
      }
      
      // First set the basic user profile from passed data
      setUserProfile({
        id: user.id,
        name: user.name || "User",
        username: user.username || "username",
        avatar: user.profileImage || `https://ui-avatars.com/api/?name=${user.name || "User"}&background=random`,
        bio: user.bio || "No bio available",
        stats: {
          followers: user?.followers?.length ||0,
          following: user?.following?. length || 0,
          posts: user?.posts?.length  || 0,
        },
      });
      
      // Then fetch additional data from API
      if (tokens?.token) {
        fetchUserProfile();
      } else {
        setIsLoading(false);
      }
    }
  }, [isOpen, user, tokens]);

  useEffect(() => {
    if (postsData?.getAllPosts) {
      setUserPosts(postsData.getAllPosts);
    }
  }, [postsData]);

  useEffect(() => {
    if (videosData?.getUserVideos) {
      setUserVideos(videosData.getUserVideos);
    }
  }, [videosData]);

  const handleFollowClick = async () => {
    if (!user?.id || !tokens?.id) {
      console.log('Missing user ID or token:', { userId: user?.id, tokenId: tokens?.id });
      return;
    }

    console.log('Following/Unfollowing user:', user.id, 'Current following status:', isFollowing);

    try {
      const result = await followUser({
        variables: { id: user.id.toString() }
      });
      
      console.log('Follow mutation result:', result);
      
      setIsFollowing(prev => !prev);
      
      // Update follower count in profile
      setUserProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          followers: isFollowing ? prev.stats.followers - 1 : prev.stats.followers + 1
        }
      }));

      // Show success message
      const message = isFollowing ? 'Unfollowed successfully!' : 'Following successfully!';
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${isFollowing ? '#EF4444' : '#10B981'};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          ${message}
        </div>
      `;
      console.log("assifsifufff");
      
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error following user:', error);
      console.error('Error details:', error.message);
      if (error.graphQLErrors) {
        console.error('GraphQL errors:', error.graphQLErrors);
      }
      if (error.networkError) {
        console.error('Network error:', error.networkError);
      }
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #EF4444;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          Failed to ${isFollowing ? 'unfollow' : 'follow'} user: ${error.message}
        </div>
      `;
      
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv);
        }
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {/* Cover Image */}
          <div 
            className="h-32 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500"
            style={{
              backgroundImage: userProfile?.cover ? `url(${userProfile.cover})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-2 hover:bg-opacity-30 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Profile Image */}
          <div className="absolute -bottom-12 left-6">
            <img
              src={userProfile?.avatar || user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=random`}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 px-6 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {/* Name and Username */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {userProfile?.name  || "User"}
                </h2>
                <p className="text-gray-600">
                  @{userProfile?.username  || "username"}
                </p>
              </div>

              {/* Bio */}
              {userProfile?.bio && (
                <p className="text-gray-700 text-sm mb-4">
                  {userProfile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex justify-around mb-6 py-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">
                    {userProfile?.stats?.posts || 0}
                  </div>
                  <div className="text-xs text-gray-600">Posts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">
                    {userProfile?.stats?.followers || 0}
                  </div>
                  <div className="text-xs text-gray-600">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">
                    {userProfile?.stats?.following || 0}
                  </div>
                  <div className="text-xs text-gray-600">Following</div>
                </div>
              </div>

              {/* Action Buttons */}
              {tokens?.id !== user?.id && (
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={handleFollowClick}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab(0)}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 0
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Posts ({userPosts.length})
                </button>
                <button
                  onClick={() => setActiveTab(1)}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 1
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reels ({userVideos.length})
                </button>
              </div>

              {/* Content Grid */}
              <div className="max-h-64 overflow-y-auto">
                {activeTab === 0 ? (
                  // Posts Grid
                  <div className="grid grid-cols-3 gap-1">
                    {userPosts.length === 0 ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        No posts yet
                      </div>
                    ) : (
                      userPosts.map((post, index) => (
                        <div key={post.id || index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                          {post.imageUrl && (
                            <img
                              src={post.imageUrl}
                              alt="Post"
                              className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // Reels Grid
                  <div className="grid grid-cols-3 gap-1">
                    {userVideos.length === 0 ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        No reels yet
                      </div>
                    ) : (
                      userVideos.map((video, index) => (
                        <div key={video.id || index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative">
                          <video
                            src={video.videoUrl}
                            className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 text-white opacity-80">
                              <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;