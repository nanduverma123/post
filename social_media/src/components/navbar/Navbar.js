import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import Sidebar from "../sidebar/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { GetTokenFromCookie } from '../getToken/GetToken';
import { useSelector } from "react-redux";


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState();
  const [tokens, setTokens] = useState();

  const navigate = useNavigate();
  

  useEffect(() => {
    const decodedUser = GetTokenFromCookie();
    console.log('🔍 Navbar - Decoded user from cookie:', decodedUser);
    setTokens(decodedUser);
    
    // Set immediate fallback image if no profile image is set
    if (decodedUser?.name && !image) {
      console.log('🔄 Setting immediate fallback image for navbar');
      setImage(`https://ui-avatars.com/api/?name=${decodedUser.name}&background=random`);
    }
  }, [])


  const user = async () => {
    if (!tokens?.id) { 
      console.log('❌ No tokens available in navbar');
      return "";
    }
    try {
      console.log('🔍 Fetching navbar profile for user:', tokens?.id);
      
      // Use getMe query without parameters (it uses context)
      const query = `
        query {
          getMe {
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
      
      const response = await axios.post("http://localhost:5000/graphql", { 
        query 
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.token || ''}`,
        },
        withCredentials: true,
      })

      console.log('🔍 Navbar API Response:', response?.data);
      const userData = response?.data?.data?.getMe;
      
      if (userData) {
        console.log('✅ Setting navbar profile image:', userData?.profileImage);
        if (userData?.profileImage) {
          setImage(userData.profileImage);
        } else if (userData?.name) {
          // Use generated avatar if no profile image
          setImage(`https://ui-avatars.com/api/?name=${userData.name}&background=random`);
        }
      } else {
        console.log('❌ No user data received in navbar');
      }
    }
    catch (error) {
      console.error('❌ Error fetching navbar profile:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  }
  useEffect(() => {
    if (tokens?.id) {
      user();
    }
  }, [tokens])

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      console.log('🔄 Profile updated, refreshing navbar image');
      if (tokens?.id) {
        user();
      }
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [tokens])

  const handleSearchIconClick = () => {
    navigate('/search');
  };

  const onMenuClick = () => setIsOpen(!isOpen);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-[60]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left - Logo and Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={onMenuClick}
                className="p-2 hover:bg-purple-100 rounded-md transition-all duration-300 md:hidden"
                aria-label="Menu"
              >
                <div className="w-6 h-6 grid grid-cols-2 gap-1">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span
                      key={idx}
                      className="w-2.5 h-2.5 bg-purple-600 rounded-sm hover:scale-90 transition-all duration-300"
                    ></span>
                  ))}
                </div>
              </button>
              <span className="text-2xl font-bold text-purple-600">
                Social
              </span>
            </div>

            {/* Right - Search & Profile */}
            <div className="flex items-center space-x-4">
              {/* Search Icon */}
              <button
                onClick={handleSearchIconClick}
                className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <FaSearch className="text-xl" />
              </button>

              {/* Profile Picture */}
              <Link to="/profile" className="block">
                {image ? (
                  <img
                    src={image}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-purple-500 hover:border-purple-600 transition-colors"
                    onError={(e) => {
                      console.log('❌ Profile image failed to load, using fallback');
                      e.target.src = `https://ui-avatars.com/api/?name=${tokens?.name || 'User'}&background=random`;
                    }}
                  />
                ) : tokens?.name ? (
                  <img
                    src={`https://ui-avatars.com/api/?name=${tokens.name}&background=random`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-purple-500 hover:border-purple-600 transition-colors"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse border-2 border-purple-500"></div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;
