export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { endpoint, token } = req.query;

  if (!endpoint || !token) {
    res.status(400).json({ error: 'Missing endpoint or token' });
    return;
  }

  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `https://graph.facebook.com/v19.0/${endpoint}${separator}access_token=${token}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
