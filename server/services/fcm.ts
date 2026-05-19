import { storage } from "../storage";
import { createRequire } from "module";

// Initialize Firebase Admin SDK
let firebaseApp: any = null;
let admin: any = null;

// Try to import firebase-admin (may not be installed)
// Using createRequire for ES modules compatibility
try {
  const require = createRequire(import.meta.url);
  admin = require("firebase-admin");
} catch (error) {
  console.warn("⚠️  firebase-admin not installed - install it with: npm install firebase-admin");
}

export function initializeFirebase(): void {
  if (!admin) {
    console.warn("⚠️  firebase-admin not available - push notifications will be logged to console only");
    return;
  }

  if (firebaseApp) {
    return; // Already initialized
  }

  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FCM_PROJECT_ID;

  // Debug logging
  console.log("🔍 FCM Configuration Check:");
  console.log(`   FCM_SERVICE_ACCOUNT_JSON exists: ${!!serviceAccountJson}`);
  console.log(`   FCM_SERVICE_ACCOUNT_JSON length: ${serviceAccountJson?.length || 0}`);
  console.log(`   FCM_PROJECT_ID exists: ${!!projectId}`);

  if (!serviceAccountJson && !projectId) {
    console.warn("⚠️  FCM not configured - push notifications will be logged to console only");
    console.warn("   Set FCM_SERVICE_ACCOUNT_JSON or FCM_PROJECT_ID to enable real push notifications");
    return;
  }

  try {
    if (serviceAccountJson) {
      // Parse JSON string from environment variable
      let serviceAccount: any;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (parseError: any) {
        console.error("❌ Failed to parse FCM_SERVICE_ACCOUNT_JSON:", parseError.message);
        console.error("   First 200 chars:", serviceAccountJson.substring(0, 200));
        console.warn("⚠️  Push notifications disabled - invalid FCM configuration");
        return;
      }
      
      // The private key should already be properly formatted in the JSON
      // Only normalize line endings if needed
      if (serviceAccount.private_key) {
        // Check if key already has proper newlines
        if (serviceAccount.private_key.includes('\\n')) {
          // Replace escaped \n with actual newlines
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        // Ensure proper line endings
        serviceAccount.private_key = serviceAccount.private_key
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
      }
      
      // Try to initialize Firebase
      try {
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin SDK initialized with service account");
      } catch (certError: any) {
        if (certError.message?.includes('private key') || certError.message?.includes('DER')) {
          console.error("❌ FCM Private Key Error: The private key in FCM_SERVICE_ACCOUNT_JSON appears to be corrupted.");
          console.error("   Solution: Regenerate the service account key from Google Cloud Console:");
          console.error("   1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts");
          console.error("   2. Select project: barberapp-fe3b1");
          console.error("   3. Click on: firebase-adminsdk-fbsvc@barberapp-fe3b1.iam.gserviceaccount.com");
          console.error("   4. Go to 'Keys' tab → 'Add Key' → 'Create new key' → JSON");
          console.error("   5. Replace FCM_SERVICE_ACCOUNT_JSON in .env with the new key");
          console.warn("⚠️  Push notifications disabled until FCM key is fixed");
        } else {
          throw certError;
        }
      }
    } else if (projectId) {
      // Use default credentials (for Google Cloud environments)
      firebaseApp = admin.initializeApp({
        projectId,
      });
      console.log("✅ Firebase Admin SDK initialized with default credentials");
    }
  } catch (error: any) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
    console.warn("⚠️  Push notifications will be logged to console only");
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class FCMNotificationService {
  async sendToToken(token: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!firebaseApp) {
      console.log(`🔔 [FCM Mock] PUSH to token ${token.substring(0, 20)}...: ${payload.title} - ${payload.body}`);
      return false;
    }

    try {
      const message: any = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: "high" as const,
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: "/icon-192x192.png",
            badge: "/badge-72x72.png",
          },
        },
      };

      const response = await admin!.messaging().send(message);
      console.log(`✅ Successfully sent FCM message: ${response}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error sending FCM message to token ${token.substring(0, 20)}...:`, error);
      
      // If token is invalid, remove it from database
      if (error.code === "messaging/invalid-registration-token" || 
          error.code === "messaging/registration-token-not-registered") {
        try {
          await storage.deleteFcmToken(token);
          console.log(`🗑️  Removed invalid FCM token from database`);
        } catch (deleteError) {
          console.error("Error deleting invalid token:", deleteError);
        }
      }
      
      return false;
    }
  }

  async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<{ success: number; failure: number }> {
    if (!firebaseApp) {
      console.log(`🔔 [FCM Mock] BULK PUSH to ${tokens.length} tokens: ${payload.title} - ${payload.body}`);
      return { success: 0, failure: tokens.length };
    }

    if (tokens.length === 0) {
      return { success: 0, failure: 0 };
    }

    // FCM supports up to 500 tokens per batch
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      try {
        const message: any = {
          tokens: batch,
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
          },
          data: payload.data || {},
          android: {
            priority: "high" as const,
            notification: {
              sound: "default",
              channelId: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
          webpush: {
            notification: {
              icon: "/icon-192x192.png",
              badge: "/badge-72x72.png",
            },
          },
        };

        const response = await admin!.messaging().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Remove invalid tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
            resp.error?.code === "messaging/invalid-registration-token" ||
            resp.error?.code === "messaging/registration-token-not-registered"
          )) {
            storage.deleteFcmToken(batch[idx]).catch(err => 
              console.error("Error deleting invalid token:", err)
            );
          }
        });

        console.log(`✅ Sent batch ${Math.floor(i / batchSize) + 1}: ${response.successCount} success, ${response.failureCount} failures`);
      } catch (error) {
        console.error(`❌ Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);
        failureCount += batch.length;
      }
    }

    return { success: successCount, failure: failureCount };
  }

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    const tokens = await storage.getFcmTokensByUser(userId);
    if (tokens.length === 0) {
      console.log(`⚠️  No FCM tokens found for user ${userId}`);
      return false;
    }

    const tokenStrings = tokens.map(t => t.token);
    const result = await this.sendToTokens(tokenStrings, payload);
    return result.success > 0;
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<{ success: number; failure: number }> {
    const tokens = await storage.getFcmTokensByUsers(userIds);
    if (tokens.length === 0) {
      console.log(`⚠️  No FCM tokens found for ${userIds.length} users`);
      return { success: 0, failure: 0 };
    }

    const tokenStrings = tokens.map(t => t.token);
    return await this.sendToTokens(tokenStrings, payload);
  }
}

export const fcmService = new FCMNotificationService();

