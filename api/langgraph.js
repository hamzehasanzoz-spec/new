// api/langgraph.js
const GROQ_MODEL = 'openai/gpt-oss-20b';

// دالة لفك تشفير الـ JWT واستخراج الـ userId
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

async function getEmbedding(text) {
  const jinaKey = process.env.JINA_API_KEY;
  const r = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jinaKey}` },
    body: JSON.stringify({ model: 'jina-embeddings-v3', input: [text], task: 'retrieval.query', dimensions: 1024 }),
  });
  const data = await r.json();
  return data.data[0].embedding;
}

async function searchDocuments(query, userId, accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const queryEmbedding = await getEmbedding(query);

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: 10,
      filter_user_id: userId, // الآن سيتم تمرير الـ ID الصحيح
    }),
  });
  
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function rerankChunks(query, chunks) {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= 3) return chunks;

  const contextText = chunks.map((c, i) => `[${i}]: ${c.content}`).join('\n\n');
  const prompt = `أعد ترتيب هذه النصوص حسب صلتها بالسؤال: "${query}". أجب بـ JSON: {"indices": [0,1,2]}\n\n${contextText}`;
  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKeys[0].trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  });

  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.indices.slice(0, 5).map(idx => chunks[idx]).filter(Boolean);
  } catch (e) {
    return chunks.slice(0, 5); 
  }
}

async function generateAnswer(query, chunks) {
  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  let systemPrompt = '';

  if (chunks && chunks.length > 0) {
    const contextText = chunks.map(c => c.content).join("\n\n");
    systemPrompt = `أنت مساعد طبي. أجب على السؤال بناءً على النصوص المرفقة فقط:\n${contextText}\n\nإذا لم تجد الإجابة، قل: "المعلومة غير موجودة في الملفات".`;
  } else {
    systemPrompt = `أنت مساعد طبي. أجب على السؤال من معرفتك العامة بأسلوب أكاديمي.`;
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKeys[0].trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }] }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, accessToken } = req.body;
    if (!query || !accessToken) return res.status(400).json({ error: 'Missing data' });

    // ⭐ استخراج الـ userId من التوكن ⭐
    const payload = decodeJWT(accessToken);
    const userId = payload?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'توكن غير صالح، لا يحتوي على معرف المستخدم' });
    }

    // البحث
    let chunks = await searchDocuments(query, userId, accessToken);
    
    // الترتيب
    chunks = await rerankChunks(query, chunks);

    // التوليد
    const finalAnswer = await generateAnswer(query, chunks);

    return res.status(200).json({ 
      success: true, 
      finalAnswer,
      debugInfo: { chunksFound: chunks.length, userId: userId }
    });

  } catch (err) {
    console.error("Pipeline Error:", err);
    return res.status(500).json({ error: err.message });
  }
}