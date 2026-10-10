// Node.js Serverless Function (بدون Edge)

function chunkText(text, chunkSize = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk);
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const jsonPayload = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function embedBatch(texts, apiKey) {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'voyage-multilingual-2',
      input: texts,
      input_type: 'document',
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(
      data?.detail || data?.error?.message || `Voyage HTTP ${r.status}`
    );
  }
  return data.data.map(d => d.embedding);
}

export default async function handler(req, res) {
  // CORS/OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. التوكن من Authorization header (Node.js style)
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();

  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization header مفقود' });
  }

  // 2. فك التوكن
  const payload = decodeJWT(accessToken);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
  }

  const userId = payload.sub;

  // 3. جسم الطلب (يُحلَّل تلقائيًا في Node.js Serverless)
  const body = req.body || {};
  const { filename, text, fileSize, fileType } = body;

  if (!filename || !text) {
    return res.status(400).json({ error: 'filename and text مطلوبان' });
  }

  // 4. تحقق من المتغيرات
  const voyageKey = process.env.VITE_VOYAGE_API_KEY;
  if (!voyageKey) {
    return res.status(500).json({ error: 'VOYAGE_API_KEY مفقود' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'متغيرات Supabase مفقودة',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    });
  }

  const apiHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 5. إنشاء document
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers: { ...apiHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        filename,
        file_size: fileSize || 0,
        file_type: fileType || 'unknown',
        status: 'processing',
      }),
    });
    const docArr = await docRes.json();
    if (!docRes.ok || !docArr[0]) {
      throw new Error(docArr?.message || 'فشل إنشاء الوثيقة');
    }
    const documentId = docArr[0].id;

    // 6. تقطيع النص
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error('لم يتم استخراج نص كافٍ');
    }

    // 7. توليد embeddings
    const BATCH_SIZE = 128;
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch, voyageKey);
      allEmbeddings.push(...embeddings);
    }

    // 8. إدراج chunks
    const chunkRows = chunks.map((content, i) => ({
      document_id: documentId,
      chunk_index: i,
      content,
      embedding: `[${allEmbeddings[i].join(',')}]`,
    }));

    const insRes = await fetch(`${supabaseUrl}/rest/v1/document_chunks`, {
      method: 'POST',
      headers: { ...apiHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify(chunkRows),
    });
    if (!insRes.ok) {
      const errTxt = await insRes.text();
      throw new Error(`فشل إدراج الأجزاء: ${errTxt.slice(0, 200)}`);
    }

    // 9. تحديث الحالة
    await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: apiHeaders,
      body: JSON.stringify({ num_chunks: chunkRows.length, status: 'ready' }),
    });

    return res.status(200).json({
      success: true,
      documentId,
      numChunks: chunkRows.length,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}