import { createHash } from 'node:crypto';

export function createEmailRateLimiter({ windowMs = 15 * 60_000, limit = 3, now = () => Date.now() } = {}) {
  const attempts = new Map();
  return function emailRateLimiter(req, res, next) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const key = createHash('sha256').update(email).digest('hex');
    const currentTime = now();
    const existing = attempts.get(key);
    const bucket = !existing || existing.expiresAt <= currentTime
      ? { count: 0, expiresAt: currentTime + windowMs }
      : existing;
    bucket.count += 1;
    attempts.set(key, bucket);
    if (bucket.count > limit) {
      return res.status(429).json({ error: true, message: 'Too many password reset requests. Please try again later.' });
    }
    return next();
  };
}
