import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const FeatureTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const features = [
    {
      id: 'share-modal',
      name: 'Share Modal Component',
      description: 'ShareModal component should exist and be importable',
      test: async () => {
        try {
          const ShareModal = await import('../share/ShareModal');
          return ShareModal.default ? 'PASS' : 'FAIL';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'shared-content',
      name: 'Shared Content Component',
      description: 'SharedContent component should exist and be importable',
      test: async () => {
        try {
          const SharedContent = await import('../chatSection/SharedContent');
          return SharedContent.default ? 'PASS' : 'FAIL';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'notification-manager',
      name: 'Notification Manager',
      description: 'NotificationManager component should exist',
      test: async () => {
        try {
          const NotificationManager = await import('../notifications/NotificationManager');
          return NotificationManager.default ? 'PASS' : 'FAIL';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'notification-popup',
      name: 'Notification Popup',
      description: 'NotificationPopup component should exist',
      test: async () => {
        try {
          const NotificationPopup = await import('../notifications/NotificationPopup');
          return NotificationPopup.default ? 'PASS' : 'FAIL';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'heart-notification-popup',
      name: 'Heart Notification Popup',
      description: 'HeartNotificationPopup component should exist',
      test: async () => {
        try {
          const HeartNotificationPopup = await import('../notifications/HeartNotificationPopup');
          return HeartNotificationPopup.default ? 'PASS' : 'FAIL';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'notification-sound',
      name: 'Notification Sound Utils',
      description: 'Notification sound utilities should be available',
      test: async () => {
        try {
          const utils = await import('../../utils/notificationSound');
          const hasRequired = utils.playNotificationSound && 
                             utils.requestNotificationPermission && 
                             utils.showBrowserNotification;
          return hasRequired ? 'PASS' : 'FAIL: Missing required functions';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'realtime-notifications',
      name: 'Real-time Notifications Hook',
      description: 'useRealTimeNotifications hook should be available',
      test: async () => {
        try {
          const hook = await import('../../hooks/useRealTimeNotifications');
          return hook.useRealTimeNotifications ? 'PASS' : 'FAIL: Hook not exported';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    },
    {
      id: 'notification-context',
      name: 'Notification Context',
      description: 'NotificationContext should be working',
      test: async () => {
        try {
          const context = await import('../../context/NotificationContext');
          const hasRequired = context.useNotifications && 
                             context.NotificationProvider;
          return hasRequired ? 'PASS' : 'FAIL: Missing context functions';
        } catch (error) {
          return `FAIL: ${error.message}`;
        }
      }
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});

    for (const feature of features) {
      setTestResults(prev => ({
        ...prev,
        [feature.id]: 'RUNNING'
      }));

      try {
        const result = await feature.test();
        setTestResults(prev => ({
          ...prev,
          [feature.id]: result
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [feature.id]: `FAIL: ${error.message}`
        }));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'RUNNING') {
      return <FaSpinner className="animate-spin text-blue-500" />;
    } else if (status === 'PASS') {
      return <FaCheckCircle className="text-green-500" />;
    } else if (status && status.startsWith('FAIL')) {
      return <FaTimesCircle className="text-red-500" />;
    }
    return null;
  };

  const getStatusColor = (status) => {
    if (status === 'RUNNING') return 'border-blue-200 bg-blue-50';
    if (status === 'PASS') return 'border-green-200 bg-green-50';
    if (status && status.startsWith('FAIL')) return 'border-red-200 bg-red-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Feature Test Dashboard
          </h1>
          <button
            onClick={runTests}
            disabled={isRunning}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        <div className="grid gap-4">
          {features.map((feature) => {
            const status = testResults[feature.id];
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-4 transition-colors ${getStatusColor(status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {feature.name}
                      </h3>
                      {getStatusIcon(status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {feature.description}
                    </p>
                    {status && status !== 'RUNNING' && (
                      <div className="text-sm">
                        <span className={`font-medium ${
                          status === 'PASS' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          Status: {status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Test Summary</h3>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">
                ✅ Passed: {Object.values(testResults).filter(r => r === 'PASS').length}
              </span>
              <span className="text-red-600">
                ❌ Failed: {Object.values(testResults).filter(r => r && r.startsWith('FAIL')).length}
              </span>
              <span className="text-blue-600">
                🔄 Running: {Object.values(testResults).filter(r => r === 'RUNNING').length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureTest;