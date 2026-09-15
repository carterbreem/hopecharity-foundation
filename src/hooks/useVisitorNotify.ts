import { useEffect } from 'react';

const VISITOR_ID_KEY = 'hcf_visitor_id';
const LAST_NOTIFY_KEY = 'hcf_last_notify';
const VISIT_COUNT_KEY = 'hcf_visit_count';
const COOLDOWN_MINUTES = 30;

function generateVisitorId(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && existing.length === 12) return existing;
    const fresh = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, fresh);
    return fresh;
  } catch {
    return generateVisitorId();
  }
}

/**
 * Determine where the visitor came from.
 * - If document.referrer is empty → "Direct"
 * - If referrer is from the same site → "Direct"
 * - Otherwise → hostname with www. stripped (e.g. "google.com", "facebook.com")
 */
function getEntry(): string {
  try {
    const ref = document.referrer;
    if (!ref) return 'Direct';
    const url = new URL(ref);
    // Same-site navigation shouldn't count as an external entry
    if (url.hostname === window.location.hostname) return 'Direct';
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
}

/**
 * Increment and return the visit count for this browser.
 * Falls back to 1 if localStorage is unavailable.
 */
function bumpVisitCount(): number {
  try {
    const stored = localStorage.getItem(VISIT_COUNT_KEY);
    const current = stored ? parseInt(stored, 10) : 0;
    const next = (isNaN(current) ? 0 : current) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

async function notify(
  visitorId: string,
  entry: string,
  visitCount: number,
): Promise<void> {
  try {
    await fetch('/api/notify-visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, entry, visitCount }),
      keepalive: true,
    });
  } catch {
    // Silently ignore — never disrupt the visitor's experience
  }
}

export function useVisitorNotify() {
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    let lastNotify = 0;
    try {
      const stored = localStorage.getItem(LAST_NOTIFY_KEY);
      lastNotify = stored ? parseInt(stored, 10) : 0;
    } catch {
      lastNotify = 0;
    }

    const now = Date.now();
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    const shouldNotify = now - lastNotify > cooldownMs;

    // Always bump the visit count so returning visitors keep incrementing,
    // but only fire the notification after the cooldown has passed.
    const visitCount = bumpVisitCount();

    if (!shouldNotify) return;

    try {
      localStorage.setItem(LAST_NOTIFY_KEY, String(now));
    } catch {
      // ignore
    }

    notify(visitorId, getEntry(), visitCount);
  }, []);
}
