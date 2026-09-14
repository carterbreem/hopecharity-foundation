import { useEffect } from 'react';

const VISITOR_ID_KEY = 'hcf_visitor_id';
const LAST_NOTIFY_KEY = 'hcf_last_notify';
const COOLDOWN_MINUTES = 30;

/**
 * Generate a random 12-character alphanumeric visitor ID.
 * Example: "a8K2mP9xQ4Lz"
 */
function generateVisitorId(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Returns the existing visitor ID from localStorage, or creates a new one.
 */
function getOrCreateVisitorId(): { id: string; isNew: boolean } {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && existing.length === 12) {
      return { id: existing, isNew: false };
    }
    const fresh = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, fresh);
    return { id: fresh, isNew: true };
  } catch {
    // localStorage may be unavailable (private mode, disabled cookies).
    // Fall back to a one-time generated ID — no persistence.
    return { id: generateVisitorId(), isNew: true };
  }
}

/**
 * Sends a single notification to our Vercel serverless function,
 * which forwards it to Telegram. Fails silently if anything goes wrong.
 */
async function notify(visitorId: string): Promise<void> {
  try {
    await fetch('/api/notify-visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    });
  } catch {
    // Silently ignore — never disrupt the visitor's experience
  }
}

/**
 * Fire-and-forget visitor notification.
 * - New visitor → notify immediately
 * - Returning visitor → notify again only if the 30-minute cooldown has passed
 * - Within cooldown → do nothing
 */
export function useVisitorNotify() {
  useEffect(() => {
    const { id } = getOrCreateVisitorId();

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

    if (!shouldNotify) return;

    // Update timestamp FIRST so we don't double-fire on React StrictMode's
    // double-render in development.
    try {
      localStorage.setItem(LAST_NOTIFY_KEY, String(now));
    } catch {
      // ignore
    }

    notify(id);
  }, []);
}
