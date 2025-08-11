import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Main from './components/main/Main';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/profile';
import NotificationsPage from './pages/NotificationsPage';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationManager from './components/notifications/NotificationManager';
import RegisterForm from './components/login/RegisterForm';
import Otp from './components/login/Otp';
import Login from './components/login/Login';
import Password_change from './components/password_change/Password_change';
import SearchPage from './components/searchPage/searchPage';
import { GetTokenFromCookie } from './components/getToken/GetToken';
import VideoCall from './components/videocall/VideoCall'; // or actual path
import CallUser from './components/videocall/CallUser';
import ReceiveCall from './components/videocall/ReceiveCall';
import IncomingCallNotification from './components/videocall/IncomingCallNotification';
import Reel from './components/Reels/Reel';
import FeatureTest from './components/test/FeatureTest';



function App() {
  useEffect(() => {
    const decodedUser = GetTokenFromCookie();
    console.log("User Info:", decodedUser);
  }, []);

  return (
    <Router>
      <NotificationProvider>
        <ChatProvider>
          {/* Global incoming call notification handler */}
          <IncomingCallNotification />
          
          {/* Global notification popup handler */}
          <NotificationManager />
          
          <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/otp" element={<Otp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/change" element={<Password_change />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/reels" element={<Reel />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/test" element={<FeatureTest />} />

          {/* ✅ New video call route */}
          {/* <Route path="/video/:roomID" element={<VideoCall/>} /> */}
                    <Route path="/call" element={<CallUser />} />
           <Route path="/receive" element={<ReceiveCall />} />
          <Route path="/video-call" element={<VideoCall />} />
        </Routes>
        
        {/* Toast Container for notifications */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        </ChatProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
