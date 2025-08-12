// import React from "react";

// export default function UserInfo({ profile, isFollowed, setIsFollowed }) {
//   return (
//     <div className="w-full flex justify-center mt-20">
//       <div className="flex flex-col items-center w-full max-w-[26rem] px-3 sm:px-5">
//         <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-purple-700">
//           {profile.name}
//         </h2>
//         <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
//           {profile.bio}
//         </p>

//         {/* Stats */}
//         <div className="flex justify-center gap-3 xs:gap-5 sm:gap-10 mt-4 xs:mt-5 w-full">
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.followers}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Followers
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.following}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Following
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.posts}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Posts
//             </span>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex gap-2 xs:gap-3 sm:gap-4 mt-4 xs:mt-5 w-full">
//           <button
//             className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow flex items-center justify-center gap-1 transition text-xs sm:text-sm md:text-base border border-purple-600 focus:outline-none ${
//               isFollowed
//                 ? "bg-purple-600 text-white"
//                 : "bg-white text-purple-700 hover:bg-purple-50"
//             } cursor-pointer`}
//             onClick={() => setIsFollowed((f) => !f)}
//           >
//             <span className="inline-flex items-center justify-center">
//               {isFollowed ? (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 20 20"
//                   stroke="white"
//                   className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 10l4 4 6-6"
//                   />
//                 </svg>
//               ) : (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 20 20"
//                   stroke="currentColor"
//                   className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M10 5v10m5-5H5"
//                   />
//                 </svg>
//               )}
//               <span>{isFollowed ? "Following" : "Follow"}</span>
//             </span>
//           </button>

//           <button className="flex-1 min-w-0 bg-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-700 transition text-xs sm:text-sm md:text-base text-center cursor-pointer">
//             Message
//           </button>

//           <button className="flex-1 min-w-0 bg-purple-100 text-purple-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-200 transition text-xs sm:text-sm md:text-base text-center cursor-pointer">
//             Insight
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }






// import React, { useState } from "react";
// import { gql,useQuery, useMutation } from "@apollo/client";
// import { GetTokenFromCookie } from '../getToken/GetToken';
// import { useEffect } from "react";

// const FOLLOW_UNFOLLOW = gql`
//   mutation FollowUnfollow($id: ID!) {
//     followAndUnfollow(id: $id) {
//     id   
//       name
//     }
//   }
// `;
// const GET_USER_INFO = gql`
//   query GetUserInformation($id: ID!) {
//     getUserInformation(id: $id) {
//       id
//       name
//       username
//       bio
//       followers {
//         id
//       }
//       following {
//         id
//       }
//       posts {
//         id
//       }
//     }
//   }
// `;

// export default function UserInfo({setProfile, profile, isFollowed, setIsFollowed}) {

//     const decodedUser = GetTokenFromCookie();

//     // Fetch user information including real counts
//     const safeUserId = profile.id ? String(profile.id).replace(/[^a-zA-Z0-9]/g, '') : null;
//     const { data: userInfoData, loading: userInfoLoading, refetch: refetchUserInfo } = useQuery(GET_USER_INFO, {
//       variables: { id: safeUserId },
//       skip: !safeUserId,
//       fetchPolicy: 'cache-and-network', // Always fetch fresh data
//       onCompleted: (data) => {
//         if (data?.getUserInformation) {
//           const userInfo = data.getUserInformation;
//           console.log('📊 Updated user stats:', {
//             followers: userInfo.followers?.length || 0,
//             following: userInfo.following?.length || 0,
//             posts: userInfo.posts?.length || 0
//           });
          
//           // Update profile with real counts
//           const updatedProfile = {
//             ...profile,
//             stats: {
//               followers: userInfo.followers?.length || 0,
//               following: userInfo.following?.length || 0,
//               posts: userInfo.posts?.length || 0
//             }
//           };
//           setProfile(updatedProfile);
//         }
//       },
//       onError: (error) => {
//         console.error("Error fetching user info:", error);
//       }
//     });

// const [followCounts, setFollowCounts] = useState(profile.stats.followers);

//   // Listen for profile updates from other components
//   useEffect(() => {
//     const handleProfileUpdate = () => {
//       console.log('🔄 Profile update event received, refetching user info...');
//       refetchUserInfo();
//     };
    
//     window.addEventListener('profileUpdated', handleProfileUpdate);
//     window.addEventListener('postUploaded', handleProfileUpdate);
//     window.addEventListener('postDeleted', handleProfileUpdate);
    
//     return () => {
//       window.removeEventListener('profileUpdated', handleProfileUpdate);
//       window.removeEventListener('postUploaded', handleProfileUpdate);
//       window.removeEventListener('postDeleted', handleProfileUpdate);
//     };
//   }, [refetchUserInfo]);
//   const [followUnfollow, { loading }] = useMutation(FOLLOW_UNFOLLOW, {
//     variables: { 
//       id: safeUserId ,
//      },
//     onCompleted: (data) => {
//       const isNowFollowed = !isFollowed;
//       setIsFollowed(isNowFollowed);
//       const newCount = isNowFollowed ? followCounts + 1 : followCounts - 1;
//       setFollowCounts(newCount);
      
//       // Update profile with new follower count
//       const updatedProfile = {
//         ...profile,
//         stats: {
//           ...profile.stats,
//           followers: Number(newCount),
//         },
//       };
//       setProfile(updatedProfile);
      
//       // Refetch user info to get updated counts
//       refetchUserInfo();
      
//       try {
//         localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
//       } catch (error) {
//         console.error("Error saving user profile to localStorage:", error);
//       }
//     },
//     onError: (err) => {
//       console.error("Follow/Unfollow error:", err);
//       alert("Something went wrong: " + err.message);
//     },
//   });
//   let  all = null;
//   const handleFollowClick = async() => {
//     if (!loading) {
//      all =  await followUnfollow();
//     }
//     console.log(all.data);
    
//   };
  

//   return (
//     <div className="w-full flex justify-center mt-20">
//       <div className="flex flex-col items-center w-full max-w-[26rem] px-3 sm:px-5">
//         <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-purple-700">
//           {profile.name}
//         </h2>
//          <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
//           {profile.username}
//         </p>
//         <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
//           {profile.bio}
//         </p>

//         {/* Stats */}
//         <div className="flex justify-center gap-3 xs:gap-5 sm:gap-10 mt-4 xs:mt-5 w-full">
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {userInfoLoading ? (
//                 <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
//               ) : (
//                 userInfoData?.getUserInformation?.followers?.length || profile.stats.followers || 0
//               )}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Followers
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {userInfoLoading ? (
//                 <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
//               ) : (
//                 userInfoData?.getUserInformation?.following?.length || profile.stats.following || 0
//               )}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Following
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {userInfoLoading ? (
//                 <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
//               ) : (
//                 userInfoData?.getUserInformation?.posts?.length || profile.stats.posts || 0
//               )}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Posts
//             </span>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex gap-2 xs:gap-3 sm:gap-4 mt-4 xs:mt-5 w-full">
//           {decodedUser?.id?.toString() === profile.id?.toString() ? (
//             <button
//               className="flex-1 min-w-0 bg-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-700 transition text-xs sm:text-sm md:text-base text-center cursor-pointer"
//               onClick={() => {
//                 // Optionally, you can trigger profile edit modal here or navigate to edit page
//                 const event = new CustomEvent('openProfileEdit');
//                 window.dispatchEvent(event);
//               }}
//             >
//               Edit Profile
//             </button>
//           ) : (
//             <button
//               disabled={loading}
//               className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow flex items-center justify-center gap-1 transition text-xs sm:text-sm md:text-base border border-purple-600 focus:outline-none ${
//                 isFollowed
//                   ? "bg-purple-600 text-white"
//                   : "bg-white text-purple-700 hover:bg-purple-50"
//               } cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
//               onClick={handleFollowClick}
//             >
//               <span className="inline-flex items-center justify-center">
//                 {isFollowed ? (
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 20 20"
//                     stroke="white"
//                     className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M5 10l4 4 6-6"
//                     />
//                   </svg>
//                 ) : (
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 20 20"
//                     stroke="currentColor"
//                     className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M10 5v10m5-5H5"
//                     />
//                   </svg>
//                 )}
//                 <span>{isFollowed ? "Following" : "Follow"}</span>
//               </span>
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// import React from "react";

// export default function UserInfo({ profile, isFollowed, setIsFollowed }) {
//   return (
//     <div className="w-full flex justify-center mt-20">
//       <div className="flex flex-col items-center w-full max-w-[26rem] px-3 sm:px-5">
//         <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-purple-700">
//           {profile.name}
//         </h2>
//         <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
//           {profile.bio}
//         </p>

//         {/* Stats */}
//         <div className="flex justify-center gap-3 xs:gap-5 sm:gap-10 mt-4 xs:mt-5 w-full">
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.followers}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Followers
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.following}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Following
//             </span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
//               {profile.stats.posts}
//             </span>
//             <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
//               Posts
//             </span>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex gap-2 xs:gap-3 sm:gap-4 mt-4 xs:mt-5 w-full">
//           <button
//             className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow flex items-center justify-center gap-1 transition text-xs sm:text-sm md:text-base border border-purple-600 focus:outline-none ${
//               isFollowed
//                 ? "bg-purple-600 text-white"
//                 : "bg-white text-purple-700 hover:bg-purple-50"
//             } cursor-pointer`}
//             onClick={() => setIsFollowed((f) => !f)}
//           >
//             <span className="inline-flex items-center justify-center">
//               {isFollowed ? (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 20 20"
//                   stroke="white"
//                   className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 10l4 4 6-6"
//                   />
//                 </svg>
//               ) : (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 20 20"
//                   stroke="currentColor"
//                   className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M10 5v10m5-5H5"
//                   />
//                 </svg>
//               )}
//               <span>{isFollowed ? "Following" : "Follow"}</span>
//             </span>
//           </button>

//           <button className="flex-1 min-w-0 bg-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-700 transition text-xs sm:text-sm md:text-base text-center cursor-pointer">
//             Message
//           </button>

//           <button className="flex-1 min-w-0 bg-purple-100 text-purple-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-200 transition text-xs sm:text-sm md:text-base text-center cursor-pointer">
//             Insight
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }






import React, { useState } from "react";
import { gql,useQuery, useMutation } from "@apollo/client";
import { GetTokenFromCookie } from '../getToken/GetToken';
import { useEffect } from "react";

const FOLLOW_UNFOLLOW = gql`
  mutation FollowUnfollow($id: ID!) {
    followAndUnfollow(id: $id) {
    id   
      name
    }
  }
`;
const GET_USER_INFO = gql`
  query GetUserInformation($id: ID!) {
    getUserInformation(id: $id) {
      id
      name
      username
      bio
      followers {
        id
      }
      following {
        id
      }
      posts {
        id
      }
    }
  }
`;

export default function UserInfo({setProfile, profile, isFollowed, setIsFollowed}) {

    const decodedUser = GetTokenFromCookie();

    // Fetch user information including real counts
    const { data: userInfoData, loading: userInfoLoading, refetch: refetchUserInfo } = useQuery(GET_USER_INFO, {
      variables: { id: profile.id },
      skip: !profile.id,
      fetchPolicy: 'cache-and-network', // Always fetch fresh data
      onCompleted: (data) => {
        if (data?.getUserInformation) {
          const userInfo = data.getUserInformation;
          console.log('📊 Updated user stats:', {
            followers: userInfo.followers?.length || 0,
            following: userInfo.following?.length || 0,
            posts: userInfo.posts?.length || 0
          });
          
          // Update profile with real counts
          const updatedProfile = {
            ...profile,
            stats: {
              followers: userInfo.followers?.length || 0,
              following: userInfo.following?.length || 0,
              posts: userInfo.posts?.length || 0
            }
          };
          setProfile(updatedProfile);
        }
      },
      onError: (error) => {
        console.error("Error fetching user info:", error);
      }
    });

const [followCounts, setFollowCounts] = useState(profile.stats.followers);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔄 Profile update event received, refetching user info...');
      refetchUserInfo();
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('postUploaded', handleProfileUpdate);
    window.addEventListener('postDeleted', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('postUploaded', handleProfileUpdate);
      window.removeEventListener('postDeleted', handleProfileUpdate);
    };
  }, [refetchUserInfo]);
  const [followUnfollow, { loading }] = useMutation(FOLLOW_UNFOLLOW, {
    variables: { 
      id: profile.id?.toString() ,
     },
    onCompleted: (data) => {
      const isNowFollowed = !isFollowed;
      setIsFollowed(isNowFollowed);
      const newCount = isNowFollowed ? followCounts + 1 : followCounts - 1;
      setFollowCounts(newCount);
      
      // Update profile with new follower count
      const updatedProfile = {
        ...profile,
        stats: {
          ...profile.stats,
          followers: Number(newCount),
        },
      };
      setProfile(updatedProfile);
      
      // Refetch user info to get updated counts
      refetchUserInfo();
      
      try {
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      } catch (error) {
        console.error("Error saving user profile to localStorage:", error);
      }
    },
    onError: (err) => {
      console.error("Follow/Unfollow error:", err);
      alert("Something went wrong: " + err.message);
    },
  });
  let  all = null;
  const handleFollowClick = async() => {
    if (!loading) {
     all =  await followUnfollow();
    }
    console.log(all.data);
    
  };
  

  return (
    <div className="w-full flex justify-center mt-20">
      <div className="flex flex-col items-center w-full max-w-[26rem] px-3 sm:px-5">
        <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-purple-700">
          {profile.name}
        </h2>
         <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
          {profile.username}
        </p>
        <p className="text-center text-gray-500 text-sm xs:text-base sm:text-lg md:text-xl mt-2 whitespace-pre-line">
          {profile.bio}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-3 xs:gap-5 sm:gap-10 mt-4 xs:mt-5 w-full">
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
              {userInfoLoading ? (
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
              ) : (
                userInfoData?.getUserInformation?.followers?.length || profile.stats.followers || 0
              )}
            </span>
            <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
              Followers
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
              {userInfoLoading ? (
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
              ) : (
                userInfoData?.getUserInformation?.following?.length || profile.stats.following || 0
              )}
            </span>
            <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
              Following
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm xs:text-base sm:text-lg md:text-xl text-purple-700">
              {userInfoLoading ? (
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
              ) : (
                userInfoData?.getUserInformation?.posts?.length || profile.stats.posts || 0
              )}
            </span>
            <span className="text-[11px] xs:text-sm sm:text-base md:text-lg text-gray-500">
              Posts
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 xs:gap-3 sm:gap-4 mt-4 xs:mt-5 w-full">
          {decodedUser?.id?.toString() === profile.id?.toString() ? (
            <button
              className="flex-1 min-w-0 bg-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow hover:bg-purple-700 transition text-xs sm:text-sm md:text-base text-center cursor-pointer"
              onClick={() => {
                // Optionally, you can trigger profile edit modal here or navigate to edit page
                const event = new CustomEvent('openProfileEdit');
                window.dispatchEvent(event);
              }}
            >
              Edit Profile
            </button>
          ) : (
            <button
              disabled={loading}
              className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-semibold shadow flex items-center justify-center gap-1 transition text-xs sm:text-sm md:text-base border border-purple-600 focus:outline-none ${
                isFollowed
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-700 hover:bg-purple-50"
              } cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleFollowClick}
            >
              <span className="inline-flex items-center justify-center">
                {isFollowed ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 20"
                    stroke="white"
                    className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l4 4 6-6"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 20"
                    stroke="currentColor"
                    className="w-4 h-4 sm:w-5 sm:h-5 mr-[2px]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 5v10m5-5H5"
                    />
                  </svg>
                )}
                <span>{isFollowed ? "Following" : "Follow"}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

