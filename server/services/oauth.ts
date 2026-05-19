import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "../storage";
import { comparePassword } from "./auth";
import type { User } from "@shared/schema";

let oauthConfigCache: any = null;
let lastConfigCheck = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getOAuthConfig() {
  const now = Date.now();
  if (oauthConfigCache && (now - lastConfigCheck) < CONFIG_CACHE_TTL) {
    return oauthConfigCache;
  }

  try {
    const config = await storage.getOAuthConfig();
    oauthConfigCache = config;
    lastConfigCheck = now;
    return config;
  } catch (error) {
    console.error("Failed to load OAuth config from database:", error);
    return null;
  }
}

export async function setupOAuth() {
  const config = await getOAuthConfig();
  
  // Setup Local Strategy (Email/Password)
  passport.use(new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password"
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }
        
        // Check if user is active
        if (!user.isActive) {
          return done(null, false, { message: "Account is suspended. Please contact support." });
        }
        
        // Check if email is verified (allow admin to bypass for first login)
        if (!user.emailVerified && user.role !== 'admin') {
          return done(null, false, { message: "Please verify your email before logging in" });
        }
        
        // Check if user has a password (not OAuth-only user)
        if (!user.password) {
          return done(null, false, { message: "Please use social login for this account" });
        }
        
        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        
        // Update last login time
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  // Setup Google OAuth Strategy
  const googleClientId = config?.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = config?.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = config?.baseUrl || process.env.BASE_URL || "http://localhost:5100";

  // Always register Google strategy to prevent "Unknown strategy" errors
  // But it will only work if properly configured
  if (googleClientId && googleClientSecret && (config?.googleEnabled || process.env.GOOGLE_CLIENT_ID)) {
    console.log("✅ Setting up Google OAuth with credentials");
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: `${baseUrl}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await storage.getUserByOAuthId("google", profile.id);
      
      if (!user) {
        // Create new user - OAuth users are automatically verified
        user = await storage.createUser({
          firstName: profile.name?.givenName || profile.displayName || "User",
          email: profile.emails?.[0]?.value || `${profile.id}@google.com`,
          oauthProvider: "google",
          oauthId: profile.id,
          emailVerified: true,
          lastLoginAt: new Date()
        });
      } else {
        // Update last login time for existing user
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  } else {
    console.log("⚠️  Google OAuth not configured - social login disabled");
    console.log("   To enable: Configure in Admin → OAuth tab or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
  }

  // Setup Facebook OAuth Strategy
  const facebookAppId = config?.facebookAppId || process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = config?.facebookAppSecret || process.env.FACEBOOK_APP_SECRET;

  // Always register Facebook strategy to prevent "Unknown strategy" errors
  if (facebookAppId && facebookAppSecret && (config?.facebookEnabled || process.env.FACEBOOK_APP_ID)) {
    console.log("✅ Setting up Facebook OAuth with credentials");
    passport.use(new FacebookStrategy({
      clientID: facebookAppId,
      clientSecret: facebookAppSecret,
      callbackURL: `${baseUrl}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'email', 'first_name']
    }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await storage.getUserByOAuthId("facebook", profile.id);
      
      if (!user) {
        // Create new user - OAuth users are automatically verified
        user = await storage.createUser({
          firstName: profile.name?.givenName || profile.displayName || "User",
          email: profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
          oauthProvider: "facebook",
          oauthId: profile.id,
          emailVerified: true,
          lastLoginAt: new Date()
        });
      } else {
        // Update last login time for existing user
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
  } else {
    console.log("⚠️  Facebook OAuth not configured - social login disabled");
    console.log("   To enable: Configure in Admin → OAuth tab or set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET");
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}
