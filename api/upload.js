export const config = { runtime: 'edge' };

// تقطيع النص
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

// توليد embeddings دفعة واحدة عبر Voyage
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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. قراءة التوكن من Authorization header
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Authorization header مفقود' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { filename, text, fileSize, fileType } = body;
  if (!filename || !text) {
    return new Response(JSON.stringify({ error: 'filename and text مطلوبان' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const voyageKey = process.env.VOYAGE_API_KEY;
  if (!voyageKey) {
    return new Response(JSON.stringify({ error: 'VOYAGE_API_KEY مفقود في Vercel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Supabase env مفقود' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. التحقق من المستخدم
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.id) {
      return new Response(JSON.stringify({
        error: 'توكن المستخدم غير صالح',
        details: userData,
      }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.id;

    // 3. إنشاء document
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
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

    // 4. تقطيع النص
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error('لم يتم استخراج نص كافٍ من الملف');
    }

    // 5. توليد embeddings دفعة واحدة (Voyage يدعم حتى 128 نص)
    const BATCH_SIZE = 128;
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch, voyageKey);
      allEmbeddings.push(...embeddings);
    }

    // 6. بناء صفوف الإدراج
    const chunkRows = chunks.map((content, i) => ({
      document_id: documentId,
      chunk_index: i,
      content,
      embedding: `[${allEmbeddings[i].join(',')}]`,
    }));

    // 7. إدراج كل الـ chunks
    const insRes = await fetch(`${supabaseUrl}/rest/v1/document_chunks`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(chunkRows),
    });
    if (!insRes.ok) {
      const errTxt = await insRes.text();
      throw new Error(`فشل إدراج الأجزاء: ${errTxt.slice(0, 200)}`);
    }

    // 8. تحديث الحالة
    await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        num_chunks: chunkRows.length,
        status: 'ready',
      }),
    });

    return new Response(JSON.stringify({
      success: true,
      documentId,
      numChunks: chunkRows.length,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({
      error: err.message,
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}