import React, { useState } from 'react';
import { MdGroups } from 'react-icons/md';
import CreateGroupModal from './CreateGroupModal';

const ChatOptions = ({ activeTab, onTabChange, onGroupCreated }) => {
  // Local state for created groups
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
    if (onGroupCreated) {
      onGroupCreated(group);
    }
  };

  return (
    <div className="bg-white py-4 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between relative">
          {/* Back icon at the far left */}
          <div className="flex-shrink-0">
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              onClick={() => window.history.back()}
              aria-label="Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          {/* Centered chat options */}
          <div className="flex-1 flex justify-center">
            <div className="bg-gray-50 rounded-full shadow-sm border border-gray-100 px-1.5 py-1.5 w-full sm:w-auto max-w-sm flex items-center">
              <div className="flex space-x-1 sm:space-x-2 flex-1">
                <button 
                  onClick={() => onTabChange('all')}
                  className={`px-3 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 ease-in-out flex-1 sm:flex-none ${
                    activeTab === 'all' 
                      ? 'bg-white text-purple-600 shadow-sm transform scale-105' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  All Chats
                </button>
                <button 
                  onClick={() => onTabChange('groups')}
                  className={`px-3 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 ease-in-out flex-1 sm:flex-none ${
                    activeTab === 'groups' 
                      ? 'bg-white text-purple-600 shadow-sm transform scale-105' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Groups
                </button>
                {/* Create Group button - show on all screen sizes */}
                <button
                  className={`px-2 sm:px-4 py-2 text-purple-600 rounded-full text-xs sm:text-sm font-semibold shadow hover:bg-purple-100 transition flex items-center justify-center relative flex-shrink-0 ${showCreateGroup ? 'bg-white' : 'bg-transparent'}`}
                  onClick={() => setShowCreateGroup(true)}
                  aria-label="Create Group"
                >
                  {/* Wrap MdGroups in a relative div for plus positioning */}
                  <span className="relative inline-block" style={{ width: '20px', height: '20px' }}>
                    <MdGroups size={20} color="#9333ea" />
                    <span className="absolute" style={{ right: '-8px', bottom: '-2px', color: '#9333ea', fontSize: '12px', lineHeight: '12px', fontWeight: 700, width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
          {/* Empty div to maintain layout balance */}
          <div className="flex-shrink-0 w-10">
          </div>
        </div>
        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleGroupCreated}
        />
        {/* Remove group preview list from here. */}
      </div>
    </div>
  );
};

export default ChatOptions; 