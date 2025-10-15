const rateLimit = require('express-rate-limit');
const { MemoryStore } = require('express-rate-limit');

// Create separate memory stores for testing
const createStore = () => process.env.NODE_ENV === 'test' ? new MemoryStore() : undefined;

// Base rate limiter for all public APIs
const baseRateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 10000 : 15 * 60 * 1000, // 15 minutes (10 seconds in test)
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Very high limit in test to avoid flakiness
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  store: createStore()
});

// More strict rate limiter for comment submission
const commentRateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 10000 : 60 * 60 * 1000, // 1 hour (10 seconds in test)
  max: process.env.NODE_ENV === 'test' ? 100 : 10, // High limit in test to avoid flakiness
  message: { message: 'Too many comments from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  store: createStore()
});

// Helper to reset all limiters (useful for testing)
const resetAllLimiters = () => {
  if (process.env.NODE_ENV === 'test') {
    if (baseRateLimiter.store) {
      baseRateLimiter.store.resetAll();
      baseRateLimiter.store.resetKey('::ffff:127.0.0.1');
    }
    if (commentRateLimiter.store) {
      commentRateLimiter.store.resetAll();
      commentRateLimiter.store.resetKey('::ffff:127.0.0.1');
    }
  }
};

module.exports = {
  baseRateLimiter,
  commentRateLimiter,
  resetAllLimiters
};