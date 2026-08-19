import rateLimit from "express-rate-limit";

// Generic limiter for submission endpoints (donations/requests) to
// slow down spam/abuse.
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this account/IP, please slow down." },
});

// Tighter limiter for auth endpoints to blunt credential-stuffing /
// brute-force attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});
