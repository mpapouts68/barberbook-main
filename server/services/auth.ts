import bcrypt from "bcrypt";
import crypto from "crypto";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a random secure token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a verification token with expiry (24 hours from now)
 */
export function generateVerificationToken(): { token: string; expires: Date } {
  const token = generateToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 hours expiry
  return { token, expires };
}

/**
 * Generate a password reset token with expiry (1 hour from now)
 */
export function generateResetToken(): { token: string; expires: Date } {
  const token = generateToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1 hour expiry
  return { token, expires };
}

/**
 * Validate password strength
 * Requirements: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  
  return { valid: true, message: "Password is valid" };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize user data before sending to client (remove sensitive fields)
 */
export function sanitizeUser(user: User): Omit<User, 'password' | 'verificationToken' | 'resetPasswordToken' | 'resetPasswordExpires'> {
  const { password, verificationToken, resetPasswordToken, resetPasswordExpires, ...sanitized } = user;
  return sanitized;
}

/**
 * Check if a reset token has expired
 */
export function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

/**
 * Generate a random password for OAuth users (they won't use it)
 */
export function generateRandomPassword(): string {
  return crypto.randomBytes(32).toString("hex");
}


