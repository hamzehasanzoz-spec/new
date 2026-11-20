import { createClient } from '@supabase/supabase-js';

const GROQ_MODEL = 'openai/gpt-oss-20b';

// ⭐ دالة فك تشفير التوكن (تعمل في Node.js بسرعة وبدون إنترنت)
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const jsonPayload = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch (error) {
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

async function generateAnswer(query, chunks) {
  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  let systemPrompt = '';

  // 1. التوجيه الذكي: إذا كان سؤالاً عاماً (تحية، كيفك، من أنت) لا تبحث في الملفات
  const generalQueries = ['كيفك', 'مرحبا', 'اهلا', 'من انت', 'شو اسمك', 'صباح الخير', 'مساء الخير'];
  const isGeneral = generalQueries.some(q => query.trim().includes(q));

  if (isGeneral) {
    systemPrompt = `أنت مساعد طبي ذكي وودود. رد على تحية المستخدم بأسلوب احترافي ولطيف، واعرض عليه المساعدة في دراسته الطبية.`;
  } 
  // 2. إذا كان سؤالاً طبياً ووجدنا ملفات
  else if (chunks && chunks.length > 0) {
    const contextText = chunks.map(c => c.content).join("\n\n");
    systemPrompt = `أنت مساعد طبي. أجب على السؤال بناءً على النصوص المرفقة فقط:\n${contextText}\n\nإذا لم تجد الإجابة، قل: "المعلومة غير موجودة في الملفات".`;
  } 
  // 3. إذا كان سؤالاً طبياً عاماً (لم نجد ملفات)
  else {
    systemPrompt = `أنت مساعد طبي أكاديمي محترف. أجب على السؤال بأسلوب علمي بحت من معرفتك الطبية.`;
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

    // 1. استخراج الـ userId يدوياً (أسرع وأكثر أماناً)
    const payload = decodeJWT(accessToken);
    const userId = payload?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'توكن غير صالح أو منتهي' });
    }

    // 2. تهيئة Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. توليد المتجه والبحث
    const queryEmbedding = await getEmbedding(query);
    const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.0, 
      match_count: 5,
      filter_user_id: userId // نمرر الـ ID الذي استخرجناه يدوياً
    });

    if (searchError) {
      console.error("Search Error:", searchError);
    }

    // 4. التوليد
    const finalAnswer = await generateAnswer(query, chunks);

    // 5. إرجاع النتيجة مع بيانات التشخيص
    return res.status(200).json({ 
      success: true, 
      finalAnswer,
      debugInfo: { 
        userId: userId,
        chunksFound: chunks ? chunks.length : 0,
        dbError: searchError ? searchError.message : null
      }
    });

  } catch (err) {
    console.error("Pipeline Error:", err);
    return res.status(500).json({ error: err.message });
  }
}