import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import UserInfo from "./UserInfo";
import Tabs from "./Tabs";
import PhotoGrid from "./PhotoGrid";
import ShortsGrid from "./ShortsGrid";
import { MdVideoLibrary } from 'react-icons/md';
import { gql, useQuery } from '@apollo/client';
import { GET_ALL_POSTS,GET_ME, GET_USER_VIDEOS } from '../../graphql/mutations';
import axios, { all } from "axios";
import { GetTokenFromCookie } from '../getToken/GetToken';

export default function Main({ userId }) {
  
  const [activeTab, setActiveTab] = useState(0); // 0: Feeds, 1: Shorts, 2: Tag
  const tabRefs = [useRef(null), useRef(null), useRef(null)];
  const [underline, setUnderline] = useState(null);
  const [tokens, setTokens] = useState();
  
  const [isFollowed, setIsFollowed] = useState(false);
  const [allPosts, setAllPosts] = useState([]);
  const [userVideos, setUserVideos] = useState([]);
  // Convert profile to state for dynamic updates
  const [profile, setProfile] = useState({
    
      id: "",
      name:  "",
      username : '',
      avatar: "",
      cover: "",
      bio: "",
      stats: {
        followers: "",
        following: "",
        posts: "",
      }
  })
  
  const [showProfileEditForm, setShowProfileEditForm] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

     const user = async() => {
       // Use the userId from URL params if available, otherwise use the logged-in user's ID
       const targetUserId = userId || tokens?.id;

       
       if(!targetUserId){ 
         console.log('❌ No target user ID available');
         setIsLoadingProfile(false);
         return "";
       }
       
       setIsLoadingProfile(true);
      try{
        // Always use getUserInformation query with the targetUserId
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
        
        const variables = { id: targetUserId.toString() };
        
        const response = await axios.post("http://localhost:5000/graphql", {
          query,
          variables
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens?.token || ''}`,
          },
          withCredentials: true,
        })

        // Always get user data from getUserInformation
        const user = response?.data?.data?.getUserInformation;
        console.log(user);
        
         if (user) {
    const profileData = {
      id:  user?.id,
      name: user?.name || "User",
      username: user?.username || "username",
      avatar: user?.profileImage || "https://ui-avatars.com/api/?name=" + (user?.name || "User") + "&background=random",
      cover: user?.profileImage || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=cover&w=800&q=80",
      bio: user?.bio || "No bio available",
      stats: {
        followers: user?.followers?.length || 0,
        following: user?.following?.length || 0,
        posts: user?.posts?.length || 0,
      },
    };

    setProfile(profileData);
  } else {
    console.log('❌ No user data received');
  }

// window.location.reload();      
     }
     catch(error){
       console.error('❌ Error fetching profile data:', error);
       console.error('Error details:', error.response?.data || error.message);
       
       // Set default profile data on error
       setProfile({
         id: tokens?.id || "",
         name: tokens?.name || "User",
         username: tokens?.username || "username",
         avatar: "https://ui-avatars.com/api/?name=" + (tokens?.name || "User") + "&background=random",
         cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=cover&w=800&q=80",
         bio: "No bio available",
         stats: {
           followers: 0,
           following: 0,
           posts: 0,
         },
       });
     } finally {
       setIsLoadingProfile(false);
     }
    }
     useEffect(()=> {
      if (tokens) {
        user();
      }
     },[tokens, userId])


  useEffect(() => {
    const decodedUser = GetTokenFromCookie();
    console.log('🔍 Decoded user from cookie:', decodedUser);
    setTokens(decodedUser);
  }, []);

  // Function to update profile data
  const updateProfile = (updates) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      // Save to localStorage
      try {
        localStorage.setItem('userProfile', JSON.stringify(newProfile));
        GetTokenFromCookie()
      } catch (error) {
        console.error("Error saving profile to localStorage:", error);
      }
      return newProfile;
    });
  };

  useLayoutEffect(() => {
    try {
      if (tabRefs[activeTab] && tabRefs[activeTab].current) {
        const node = tabRefs[activeTab].current;
        if (node) {
          setUnderline({ left: node.offsetLeft, width: node.offsetWidth });
        }
      }
    } catch (error) {
      console.error("Error setting tab underline position:", error);
    }
  }, [activeTab]);

  // Set initial underline position for Feeds tab
  useLayoutEffect(() => {
    try {
      if (tabRefs[0] && tabRefs[0].current) {
        const node = tabRefs[0].current;
        if (node && !underline) {
          setUnderline({ left: node.offsetLeft, width: node.offsetWidth });
        }
      }
    } catch (error) {
      console.error("Error setting initial tab underline position:", error);
    }
  }, [underline]);

  // Fetch posts from backend
  const { data, loading, error, refetch } = useQuery(GET_ALL_POSTS, {
    variables: { userId: userId || tokens?.id },
    skip: !userId && !tokens?.id,
  });
  console.log('📄 Posts data:', data);

  // Fetch user videos for reels/shorts
  const { data: videosData, loading: videosLoading, error: videosError, refetch: refetchVideos } = useQuery(GET_USER_VIDEOS, {
    variables: { userId: userId || tokens?.id },
    skip: !userId && !tokens?.id,
  });
 
   useEffect(() => {
    if (data?.getAllPosts) {      
      setAllPosts(data.getAllPosts); // initial set
      
      // Update posts count in profile
      setProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          posts: data.getAllPosts.length
        }
      }));
    }
  }, [data]);

  useEffect(() => {
    if (videosData?.getUserVideos) {      
      setUserVideos(videosData.getUserVideos); // set user videos for reels
    }
  }, [videosData]);

  // Listen for postUploaded event to refetch posts immediately after upload
  useEffect(() => {
    const handlePostUploaded = () => {
      if (typeof refetch === 'function') refetch();
      if (typeof refetchVideos === 'function') refetchVideos(); // also refetch videos
    };
    window.addEventListener('postUploaded', handlePostUploaded);
    return () => window.removeEventListener('postUploaded', handlePostUploaded);
  }, [refetch, refetchVideos]);

  useEffect(()=>{
    const handlePostDeleted = () => {
      refetch(); // ya state update
      refetchVideos(); // also refetch videos
    };
    window.addEventListener("postDeleted", handlePostDeleted);
    return () => window.removeEventListener("postDeleted", handlePostDeleted);
  },[])

  // Keep full post objects for PostViewer, but extract imageUrls for PhotoGrid display
  const photos = allPosts || [];
  const photoUrls = allPosts ? allPosts.map(post => post.imageUrl) : [];

  useEffect(() => {
    const handleOpenProfileEdit = () => setShowProfileEditForm(true);
    window.addEventListener('openProfileEdit', handleOpenProfileEdit);
    return () => window.removeEventListener('openProfileEdit', handleOpenProfileEdit);
  }, []);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center w-full text-xs sm:text-sm md:text-base overflow-x-hidden">
      <ProfileHeader profile={profile} updateProfile={updateProfile} showProfileEditForm={showProfileEditForm} setShowProfileEditForm={setShowProfileEditForm} />
      <div className="h-8 xs:h-10 sm:h-14" />
      <UserInfo profile={profile} setProfile={setProfile} isFollowed={isFollowed} setIsFollowed={setIsFollowed} />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} tabRefs={tabRefs} />
      <div className="w-full max-w-md px-1 xs:px-2 sm:px-4 py-2 xs:py-4 sm:py-6">
        {loading && <div className="text-center py-4">Loading posts...</div>}
        {error && <div className="text-center py-4 text-red-500">Error loading posts</div>}
        {videosLoading && activeTab === 1 && <div className="text-center py-4">Loading reels...</div>}
        {videosError && activeTab === 1 && <div className="text-center py-4 text-red-500">Error loading reels</div>}
        {activeTab === 0 ? (
          <PhotoGrid photos={allPosts} currentUser={profile} />
        ) : activeTab === 1 ? (
          <ShortsGrid shortsVideos={userVideos} currentUser={profile} />
        ) : (
          <PhotoGrid photos={allPosts} currentUser={profile} />
        )}
      </div>
    </div>
  );
}

