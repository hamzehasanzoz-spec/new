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

  const { query, matchCount = 5, threshold = 0.3 } = req.body || {};
  if (!query || query.trim().length < 3) {
    return res.status(400).json({ error: 'query مطلوب (3 أحرف على الأقل)' });
  }

  const voyageKey = process.env.VOYAGE_API_KEY;
  if (!voyageKey) {
    return res.status(500).json({ error: 'VOYAGE_API_KEY مفقود' });
  }

  try {
    // 1. توليد embedding للسؤال
    const embRes = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        model: 'voyage-multilingual-2',
        input: [query],
        input_type: 'query',
      }),
    });

    const embData = await embRes.json();
    if (!embRes.ok) {
      throw new Error(embData?.detail || 'فشل توليد embedding للسؤال');
    }

    const queryEmbedding = embData.data[0].embedding;

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