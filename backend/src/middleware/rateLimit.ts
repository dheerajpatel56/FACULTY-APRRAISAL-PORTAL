import rateLimit from 'express-rate-limit';

// Stricter limits on auth endpoints — prevents brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts / IP / window
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// OTP request — even stricter (prevent email spam)
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 3, // 3 OTP requests / IP / min
  message: { error: 'Too many OTP requests. Wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — looser
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120, // 120 req / IP / min
  standardHeaders: true,
  legacyHeaders: false,
});
