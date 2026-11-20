// API Route for Agentic RAG (بدون LangGraph - متوافق 100% مع Vercel)

const GROQ_MODEL = 'llama-3.1-8b-instant'; // نموذج سريع للعمليات المعقدة

// 1. دالة مساعدة للاتصال بـ Groq
async function askGroq(messages, responseFormat = 'text') {
  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  if (groqKeys.length === 0) throw new Error("GROQ_API_KEYS missing");

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKeys[0].trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      ...(responseFormat === 'json' && { response_format: { type: 'json_object' } })
    }),
  });

  if (!res.ok) throw new Error(`Groq API Error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 2. دالة البحث في Supabase (Hybrid Search)
async function searchDocuments(query, userId, accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  // نستخدم RPC للبحث الهجين (يفترض أنك أنشأته مسبقاً)
  // إذا لم يكن موجوداً، يمكنك استخدام بحث نصي بسيط كبديل مؤقت
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/hybrid_search`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query_text: query,
      match_count: 5,
      filter_user_id: userId,
    }),
  });

  if (!res.ok) return [];
  const matches = await res.json();
  return matches || [];
}

// 3. الـ Handler الرئيسي
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, userId, accessToken } = req.body;
    if (!query || !accessToken) return res.status(400).json({ error: 'Missing data' });

    let currentQuery = query;
    let retries = 0;
    const maxRetries = 1; // محاولة إعادة صياغة واحدة فقط لتجنب البطء
    let chunks = [];
    let isGood = false;

    // الخطوة 1: حلقة البحث والتقييم
    while (retries <= maxRetries && !isGood) {
      // البحث
      chunks = await searchDocuments(currentQuery, userId, accessToken);
      
      // التقييم
      if (chunks.length === 0) {
        isGood = false;
      } else {
        const contextText = chunks.map(c => c.content).join("\n\n").slice(0, 2000);
        const gradePrompt = `هل النصوص التالية تجيب على السؤال: "${query}"؟\nالنصوص:\n${contextText}\nأجب بكلمة واحدة فقط: "yes" أو "no".`;
        
        const gradeResult = await askGroq([{ role: 'user', content: gradePrompt }]);
        isGood = gradeResult.toLowerCase().includes('yes');
      }

      // إذا كانت النتائج سيئة، أعد الصياغة
      if (!isGood && retries < maxRetries) {
        const rewritePrompt = `أعد صياغة السؤال التالي ليكون أفضل للبحث الطبي، وأجب بالسؤال الجديد فقط:\n"${currentQuery}"`;
        currentQuery = await askGroq([{ role: 'user', content: rewritePrompt }]);
        retries++;
      } else {
        break;
      }
    }

    // الخطوة 2: التوليد النهائي
    let systemPrompt = '';
    if (chunks.length > 0 && isGood) {
      const contextText = chunks.map(c => c.content).join("\n\n");
      systemPrompt = `أنت مساعد طبي. أجب على السؤال بناءً على النصوص التالية فقط:\n${contextText}\n\nإذا لم تجد الإجابة في النصوص، قل: "المعلومة غير موجودة في الملفات".`;
    } else {
      systemPrompt = `أنت مساعد طبي ذكي. أجب على السؤال من خلال معرفتك الطبية العامة بأسلوب أكاديمي.`;
    }

    const finalAnswer = await askGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]);

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      finalAnswer: finalAnswer,
      retries: retries,
      sourcesUsed: isGood ? 'files' : 'general'
    });

  } catch (err) {
    console.error("Agent Error:", err);
    return res.status(500).json({ 
      error: err.message || 'Unknown error',
      details: 'حدث خطأ في معالجة الطلب. الرجاء المحاولة مرة أخرى.'
    });
  }
}