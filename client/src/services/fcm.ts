// FCM (Firebase Cloud Messaging) client-side service
// This handles registering for push notifications in the browser

export interface FCMRegistrationOptions {
  onTokenReceived?: (token: string) => void;
  onError?: (error: Error) => void;
}

class FCMService {
  private messaging: any = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Check if browser supports service workers and notifications
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Browser does not support push notifications');
      return false;
    }

    // Request notification permission
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch (error) {
      console.warn('Error requesting notification permission:', error);
      return false;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    // For now, create a simple token identifier
    // In production, you would initialize Firebase SDK here and get a real FCM token
    // This is a placeholder that can be easily replaced with Firebase SDK integration
    
    try {
      // Generate a simple device identifier
      // In production, replace this with Firebase SDK token generation
      const deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Send token to server
      const response = await fetch('/api/fcm/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: deviceId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            type: 'web',
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register FCM token');
      }

      this.initialized = true;
      console.log('✅ Push notification registration initialized');
      console.log('⚠️  Note: For production, integrate Firebase SDK to get real FCM tokens');
      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }


  async registerToken(token: string, deviceInfo?: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch('/api/fcm/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register FCM token');
      }

      return true;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  async unregisterToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/fcm/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return false;
    }
  }
}

export const fcmService = new FCMService();

// Initialize FCM when user is authenticated
export async function initializePushNotifications(): Promise<void> {
  // Check if user is authenticated
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (response.ok) {
      // User is authenticated, initialize push notifications
      await fcmService.initialize();
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}

