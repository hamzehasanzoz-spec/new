// api/langgraph.js – المحرك الشامل (Hybrid Search + Rerank + Generate) لبيئة Vercel

const GROQ_MODEL = 'openai/gpt-oss-20b'; // النموذج المعتمد حالياً

// 1. دالة توليد Embeddings
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

// 2. دالة البحث الهجين (Hybrid Search)
async function hybridSearch(query, userId, accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const queryEmbedding = await getEmbedding(query);

  // استخدام دالة hybrid_search
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/hybrid_search`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      query_text: query,
      match_threshold: 0.1,
      match_count: 10, // جلب 10 نتائج أولية
      filter_user_id: userId,
    }),
  });
  
  if (!res.ok) {
    // خطة بديلة (Fallback) في حال لم يتم إنشاء الدالة الهجينة في Supabase بعد
    const fallbackRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: 10,
        filter_user_id: userId,
      }),
    });
    return await fallbackRes.json();
  }
  return await res.json();
}

// 3. دالة إعادة الترتيب (Reranking)
async function rerankChunks(query, chunks) {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= 3) return chunks;

  const contextText = chunks.map((c, i) => `[${i}]: ${c.content}`).join('\n\n');
  const prompt = `أنت خبير تقييم. لديك سؤال: "${query}"\nومجموعة من النصوص. رتب النصوص من الأكثر صلة إلى الأقل صلة.\nأجب بصيغة JSON تحتوي على مصفوفة من المعرفات (indices) فقط:\n{"indices": [2, 0, 1]}\n\nالنصوص:\n${contextText}`;

  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKeys[0].trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: GROQ_MODEL, // استخدام نفس النموذج
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    }),
  });

  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    const topIndices = parsed.indices.slice(0, 5);
    return topIndices.map((idx) => chunks[idx]).filter(Boolean);
  } catch (e) {
    return chunks.slice(0, 5); 
  }
}

// 4. دالة التوليد النهائي
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
    body: JSON.stringify({ 
      model: GROQ_MODEL, 
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }] 
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 5. الـ Handler الرئيسي
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, userId, accessToken } = req.body;
    if (!query || !accessToken) return res.status(400).json({ error: 'Missing data' });

    // 1. البحث الهجين
    let chunks = await hybridSearch(query, userId, accessToken);
    
    // 2. إعادة الترتيب
    chunks = await rerankChunks(query, chunks);

    // 3. التوليد
    const finalAnswer = await generateAnswer(query, chunks);

    return res.status(200).json({ 
      success: true, 
      finalAnswer,
      sourcesCount: chunks.length
    });

  } catch (err) {
    console.error("Pipeline Error:", err);
    return res.status(500).json({ error: err.message });
  }
}