export const config = { runtime: 'edge' };

// تقطيع النص إلى chunks
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

// توليد embedding عبر Gemini
async function embedText(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.error?.message || `Embedding failed: ${r.status}`);
  }
  return data.embedding.values;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
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

  const { filename, text, fileSize, fileType, accessToken } = body;
  if (!filename || !text || !accessToken) {
    return new Response(JSON.stringify({ error: 'filename, text, accessToken مطلوبة' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const geminiKey = process.env.GEMINI_KEY;
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_KEY مفقود في Vercel' }), {
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

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    // 1. الحصول على user_id من التوكن
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.id) {
      throw new Error('توكن المستخدم غير صالح');
    }
    const userId = userData.id;

    // 2. إنشاء document
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers,
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

    // 3. تقطيع النص
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error('لم يتم استخراج نص كافٍ من الملف');
    }

    // 4. توليد embeddings + إدراج chunks
    const chunkRows = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await embedText(chunks[i], geminiKey);
        chunkRows.push({
          document_id: documentId,
          chunk_index: i,
          content: chunks[i],
          embedding: `[${embedding.join(',')}]`,
        });
      } catch (err) {
        console.error(`Chunk ${i} failed:`, err.message);
      }
      // تأخير بسيط لتجنب rate limit
      if ((i + 1) % 10 === 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (chunkRows.length === 0) {
      throw new Error('فشل توليد embeddings لكل الأجزاء');
    }

    // 5. إدراج كل الـ chunks
    const insRes = await fetch(`${supabaseUrl}/rest/v1/document_chunks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunkRows),
    });
    if (!insRes.ok) {
      const errTxt = await insRes.text();
      throw new Error(`فشل إدراج الأجزاء: ${errTxt.slice(0, 200)}`);
    }

    // 6. تحديث عدد الأجزاء والحالة
    await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers,
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
    return new Response(JSON.stringify({
      error: err.message,
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}