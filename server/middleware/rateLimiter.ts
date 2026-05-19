import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Custom key generator that works with proxy
 * Uses X-Forwarded-For if available, otherwise uses express-rate-limit's ipKeyGenerator
 */
const keyGenerator = (req: any) => {
  // If behind proxy, use X-Forwarded-For header
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    // Use ipKeyGenerator helper to properly handle IPv6
    return ipKeyGenerator(req, ip);
  }
  // Fallback to express-rate-limit's built-in IP detection
  return ipKeyGenerator(req);
};

/**
 * Rate limiter for login attempts
 * Allows 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    message: "Too many login attempts from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Use custom key generator to avoid trust proxy validation
  keyGenerator,
});

/**
 * Rate limiter for registration attempts
 * Allows 3 registrations per hour per IP
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    message: "Too many registration attempts from this IP, please try again after an hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to avoid trust proxy validation
  keyGenerator,
});

/**
 * Rate limiter for password reset requests
 * Allows 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    message: "Too many password reset attempts from this IP, please try again after an hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to avoid trust proxy validation
  keyGenerator,
});

/**
 * Rate limiter for email verification resend
 * Allows 3 requests per hour per IP
 */
export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    message: "Too many verification email requests from this IP, please try again after an hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to avoid trust proxy validation
  keyGenerator,
});

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    message: "Too many requests from this IP, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to avoid trust proxy validation
  keyGenerator,
});


