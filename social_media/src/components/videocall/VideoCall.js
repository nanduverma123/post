import React, { useEffect, useState, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const VideoCall = () => {
  const [meetingData, setMeetingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [searchParams] = useSearchParams();
  
  // Get roomID and userID from URL parameters
  const roomID = searchParams.get('roomID') || "testroom123";
  const userID = searchParams.get('userID');
  
  console.log('🎥 VideoCall component loaded with:', { roomID, userID });

  const query = `
    query joinvideocall($roomID: String!) {
      joinvideocall(roomID: $roomID) {
        token
        userID
        username
        appID
        serverSecret
      }
    }
  `;

  const variables = { roomID : roomID };

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(
        "http://localhost:5000/graphql",
        { query, variables },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (response.data.errors) {
        console.error("GraphQL Error:", response.data.errors);
        setError("Failed to join video call. Please try again.");
        setLoading(false);
        return;
      }
      
      const data = response?.data?.data?.joinvideocall;

      if (data) {
        setMeetingData(data);
        try {
          if (!data) {
            setError("Missing video call data");
            setLoading(false);
            return;
          }
          
          const { appID, serverSecret, userID: zegoUserID, username } = data;

          const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            roomID,
            zegoUserID,
            username
          );

          const zp = ZegoUIKitPrebuilt.create(kitToken);

          zp.joinRoom({
            container: containerRef.current,
            scenario: {
              mode: ZegoUIKitPrebuilt.OneONoneCall,
            },
            showScreenSharingButton: true,
            showAudioVideoSettingsButton: true,
            showLeavingView: true,
            showPreJoinView: false,
          });
          
          setLoading(false);
        } catch (err) {
          console.error("Error initializing video call:", err);
          setError("Failed to initialize video call");
          setLoading(false);
        }
      } else {
        console.error("Invalid data from server:", data);
        setError("Invalid response from server");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching Zego token:", err);
      setError("Failed to connect to video call service");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Connecting to video call...</h2>
          <p className="text-gray-500">Room ID: {roomID}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Video Call Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900">
      <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
    </div>
  );
};

export default VideoCall;
