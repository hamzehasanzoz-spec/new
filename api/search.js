function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

// ⭐ توليد embedding للسؤال عبر Jina AI
async function embedQuery(text, apiKey) {
  const r = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [text],
      task: 'retrieval.query',
      dimensions: 1024,
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(
      data?.detail || data?.error?.message || `Jina HTTP ${r.status}`
    );
  }
  return data.data[0].embedding;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization header مفقود' });
  }

  const payload = decodeJWT(accessToken);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }
  const userId = payload.sub;

  const { query, matchCount = 5, threshold = 0.1 } = req.body || {};
  if (!query || query.trim().length < 3) {
    return res.status(400).json({ error: 'query مطلوب (3 أحرف على الأقل)' });
  }

  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    return res.status(500).json({ error: 'JINA_API_KEY مفقود' });
  }

  try {
    // 1. توليد embedding للسؤال
    const queryEmbedding = await embedQuery(query, jinaKey);

    // 2. البحث في قاعدة البيانات
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    const searchRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: matchCount,
        filter_user_id: userId,
      }),
    });

    const matches = await searchRes.json();
    if (!searchRes.ok) {
      throw new Error(matches?.message || 'فشل البحث');
    }

    return res.status(200).json({
      success: true,
      query,
      matches: matches || [],
      count: (matches || []).length,
    });

  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: err.message });
  }
}