// Notification sound utility functions

// Request notification permission from browser
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options
  });

  // Auto close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  return notification;
};

// Play notification sound
export const playNotificationSound = (notificationType = 'default') => {
  try {
    // Create audio context for better browser compatibility
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Different sounds for different notification types
    const soundFrequencies = {
      like: [800, 1000], // Higher pitch for likes
      comment: [600, 800], // Medium pitch for comments
      follow: [400, 600, 800], // Ascending notes for follows
      share: [500, 700, 900], // Ascending notes for shares
      default: [700, 900] // Default sound
    };

    const frequencies = soundFrequencies[notificationType] || soundFrequencies.default;
    
    // Play each frequency in sequence
    frequencies.forEach((frequency, index) => {
      setTimeout(() => {
        playTone(audioContext, frequency, 0.1, 0.2); // frequency, volume, duration
      }, index * 150); // Stagger the tones
    });

  } catch (error) {
    console.log('Could not play notification sound:', error);
    // Fallback to system beep if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.play().catch(() => {
        // Silent fail if audio doesn't work
      });
    } catch (fallbackError) {
      // Silent fail
    }
  }
};

// Helper function to play a tone
const playTone = (audioContext, frequency, volume, duration) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};