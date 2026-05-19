#!/usr/bin/env node
/**
 * Google OAuth Configuration Verification Script
 * 
 * This script checks your current OAuth configuration and helps identify
 * redirect URI mismatches.
 */

import 'dotenv/config';
import { storage } from './server/storage.js';

async function verifyOAuthConfig() {
  console.log('🔍 Verifying Google OAuth Configuration...\n');
  
  // Get configuration from database (Admin Panel)
  let dbConfig = null;
  try {
    dbConfig = await storage.getOAuthConfig();
  } catch (error) {
    console.log('⚠️  Could not load OAuth config from database:', error.message);
  }
  
  // Get configuration from environment variables
  const envConfig = {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? '***SET***' : undefined,
    baseUrl: process.env.BASE_URL,
  };
  
  // Determine which configuration is being used (priority: DB > ENV > default)
  const activeConfig = {
    googleClientId: dbConfig?.googleClientId || envConfig.googleClientId,
    googleClientSecret: dbConfig?.googleClientSecret || envConfig.googleClientSecret,
    baseUrl: dbConfig?.baseUrl || envConfig.baseUrl || 'http://localhost:5100',
    googleEnabled: dbConfig?.googleEnabled || !!envConfig.googleClientId,
    source: dbConfig ? 'Database (Admin Panel)' : envConfig.googleClientId ? 'Environment Variables (.env)' : 'Not Configured'
  };
  
  console.log('📋 Current Configuration:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Source: ${activeConfig.source}`);
  console.log(`Google Client ID: ${activeConfig.googleClientId || '❌ NOT SET'}`);
  console.log(`Google Client Secret: ${activeConfig.googleClientSecret || '❌ NOT SET'}`);
  console.log(`Base URL: ${activeConfig.baseUrl}`);
  console.log(`Google Enabled: ${activeConfig.googleEnabled ? '✅ Yes' : '❌ No'}`);
  console.log('─────────────────────────────────────────────────────────\n');
  
  // Calculate callback URL
  const callbackUrl = `${activeConfig.baseUrl}/api/auth/google/callback`;
  
  console.log('🔗 Calculated Callback URL:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Callback URL: ${callbackUrl}`);
  console.log('─────────────────────────────────────────────────────────\n');
  
  // Check configuration
  console.log('✅ Configuration Checklist:');
  console.log('─────────────────────────────────────────────────────────');
  
  const checks = [
    {
      name: 'Google Client ID is set',
      passed: !!activeConfig.googleClientId,
      fix: 'Set GOOGLE_CLIENT_ID in .env or Admin Panel'
    },
    {
      name: 'Google Client Secret is set',
      passed: !!activeConfig.googleClientSecret,
      fix: 'Set GOOGLE_CLIENT_SECRET in .env or Admin Panel'
    },
    {
      name: 'Base URL is set',
      passed: !!activeConfig.baseUrl && activeConfig.baseUrl !== 'http://localhost:5100' || process.env.NODE_ENV === 'development',
      fix: 'Set BASE_URL=https://fadefactory.cloud in .env or Admin Panel'
    },
    {
      name: 'Base URL uses HTTPS (production)',
      passed: activeConfig.baseUrl.startsWith('https://') || process.env.NODE_ENV === 'development',
      fix: 'Use https://fadefactory.cloud (not http://) for production'
    },
    {
      name: 'Base URL has no trailing slash',
      passed: !activeConfig.baseUrl.endsWith('/'),
      fix: 'Remove trailing slash from BASE_URL'
    },
    {
      name: 'Google OAuth is enabled',
      passed: activeConfig.googleEnabled,
      fix: 'Enable Google OAuth in Admin Panel or set GOOGLE_CLIENT_ID'
    }
  ];
  
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (!check.passed) {
      console.log(`   Fix: ${check.fix}`);
    }
  });
  
  console.log('─────────────────────────────────────────────────────────\n');
  
  // Show what needs to be in Google Console
  console.log('📝 Required Google Cloud Console Settings:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('\n1. Authorized JavaScript Origins:');
  console.log(`   ✅ ${activeConfig.baseUrl}`);
  if (activeConfig.baseUrl.startsWith('https://')) {
    console.log('   ✅ http://localhost:5100');
  }
  
  console.log('\n2. Authorized Redirect URIs:');
  console.log(`   ✅ ${callbackUrl}`);
  if (activeConfig.baseUrl.startsWith('https://')) {
    console.log('   ✅ http://localhost:5100/api/auth/google/callback');
  }
  
  console.log('\n─────────────────────────────────────────────────────────\n');
  
  // Final verification
  const allPassed = checks.every(c => c.passed);
  
  if (allPassed) {
    console.log('✅ Configuration looks good!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify the callback URL above matches EXACTLY in Google Cloud Console');
    console.log('2. Make sure you clicked SAVE in Google Cloud Console');
    console.log('3. Wait 1-2 minutes for Google to update');
    console.log('4. Clear browser cache and test login');
  } else {
    console.log('❌ Configuration issues found. Please fix the items marked with ❌ above.');
    console.log('\n📋 Quick Fix:');
    console.log('1. Set BASE_URL=https://fadefactory.cloud in .env file');
    console.log('2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    console.log('3. Restart PM2: pm2 restart barberbook');
    console.log('4. Run this script again to verify');
  }
  
  console.log('\n');
}

verifyOAuthConfig().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

