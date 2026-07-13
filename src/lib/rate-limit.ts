const buckets = new Map<string, { count: number; reset: number }>();
const MAX_BUCKETS_BEFORE_SWEEP = 10_000;

function sweepExpired(now: number) {
  if (buckets.size < MAX_BUCKETS_BEFORE_SWEEP) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.reset) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit = 240, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  sweepExpired(now);
  const hit = buckets.get(key);
  if (!hit || now > hit.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (hit.count >= limit) return false;
  hit.count += 1;
  return true;
}
