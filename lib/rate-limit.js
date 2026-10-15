/**
 * In-memory per-key limit. Idle keys are dropped on the next check.
 * When the map is full of visitors still inside the window, a new key is
 * allowed and not stored, so a stranger is not blocked by other people.
 */
"use strict";

function createLimiter(options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const bucketMax = options.bucketMax;
  const buckets = new Map();

  function freshStamps(list, now) {
    const kept = [];
    if (!list) return kept;
    for (let i = 0; i < list.length; i += 1) {
      if (now - list[i] < windowMs) kept.push(list[i]);
    }
    return kept;
  }

  function sweep(now) {
    buckets.forEach(function (list, key) {
      const kept = freshStamps(list, now);
      if (kept.length === 0) buckets.delete(key);
      else if (kept.length !== list.length) buckets.set(key, kept);
    });
  }

  function allow(key, nowMs) {
    const now = nowMs || Date.now();
    const stamp = String(key || "anon").slice(0, 128);
    if (buckets.size > 0) sweep(now);
    let kept = buckets.get(stamp);
    if (!kept) {
      if (buckets.size >= bucketMax) return true;
      kept = [];
      buckets.set(stamp, kept);
    }
    if (kept.length >= max) return false;
    kept.push(now);
    return true;
  }

  function reset() {
    buckets.clear();
  }

  function size() {
    return buckets.size;
  }

  return {
    allow: allow,
    reset: reset,
    size: size,
    max: max,
    windowMs: windowMs,
    bucketMax: bucketMax
  };
}

module.exports = {
  createLimiter: createLimiter
};
