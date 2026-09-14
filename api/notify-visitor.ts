// Vercel serverless function — sends a Telegram notification for each visitor.
//
// Required Vercel environment variables:
//   TELEGRAM_BOT_TOKEN — from @BotFather
//   TELEGRAM_CHAT_ID   — your personal chat ID (from @userinfobot or getUpdates)
//
// This runs server-side, so the token is never exposed to the browser.

export const config = {
  runtime: 'edge',
};

// Minimal ISO-to-country-name map for common countries.
// The header gives us a 2-letter code; we translate it to a friendly name.
// If missing, we fall back to "Unknown".
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  PL: 'Poland',
  CZ: 'Czechia',
  GR: 'Greece',
  RO: 'Romania',
  HU: 'Hungary',
  BG: 'Bulgaria',
  HR: 'Croatia',
  RU: 'Russia',
  UA: 'Ukraine',
  TR: 'Turkey',
  IL: 'Israel',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  QA: 'Qatar',
  KW: 'Kuwait',
  EG: 'Egypt',
  MA: 'Morocco',
  DZ: 'Algeria',
  TN: 'Tunisia',
  NG: 'Nigeria',
  GH: 'Ghana',
  KE: 'Kenya',
  ZA: 'South Africa',
  TZ: 'Tanzania',
  UG: 'Uganda',
  ET: 'Ethiopia',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  KH: 'Cambodia',
  MM: 'Myanmar',
  NZ: 'New Zealand',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  VE: 'Venezuela',
  EC: 'Ecuador',
  UY: 'Uruguay',
  PY: 'Paraguay',
  BO: 'Bolivia',
  CR: 'Costa Rica',
  PA: 'Panama',
  JM: 'Jamaica',
  TT: 'Trinidad and Tobago',
  BS: 'Bahamas',
  BB: 'Barbados',
};

// Only these origins may call the endpoint.
// Add your Vercel preview URLs or custom domain here later if needed.
const ALLOWED_ORIGINS = [
  'https://hopecharity-foundation.vercel.app',
];

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function formatTime(date: Date): string {
  // Format: "14 Sep 2026, 3:45 PM" in UTC.
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm} UTC`;
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders(origin) },
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return new Response(
      JSON.stringify({ error: 'Telegram credentials not configured' }),
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  // Parse body
  let visitorId = '';
  try {
    const body = await request.json();
    visitorId = typeof body?.visitorId === 'string' ? body.visitorId : '';
  } catch {
    // ignore — handled below
  }

  if (!visitorId || visitorId.length > 32) {
    return new Response(
      JSON.stringify({ error: 'Invalid visitor ID' }),
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  // Country from Vercel's IP geolocation header (server-side, not spoofable)
  const countryCode = request.headers.get('x-vercel-ip-country') || '';
  const country = COUNTRY_NAMES[countryCode] || (countryCode ? countryCode : 'Unknown');

  const time = formatTime(new Date());

  const message = [
    '• New Visitor',
    'Website: hopecharity-foundation',
    `Visitor ID: ${visitorId}`,
    `Time: ${time}`,
    `Country: ${country}`,
  ].join('\n');

  // Send to Telegram
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const telegramRes = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });

  if (!telegramRes.ok) {
    const errText = await telegramRes.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('[notify-visitor] Telegram error', telegramRes.status, errText);
    return new Response(
      JSON.stringify({ error: 'Failed to send Telegram message' }),
      { status: 502, headers: corsHeaders(origin) },
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: corsHeaders(origin) },
  );
}
