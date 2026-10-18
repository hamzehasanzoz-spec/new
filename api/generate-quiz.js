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

function parseKeys(envValue) {
  if (!envValue) return [];
  return envValue.split(',').map(k => k.trim()).filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization مفقود' });
  }

  const payload = decodeJWT(accessToken);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }
  const userId = payload.sub;

  const {
    subject = '',
    topic = '',
    numQuestions = 5,
    difficulty = 'متوسط',
    useFiles = true,
    excludeQuestions = [],
  } = req.body || {};

  const jinaKey = process.env.JINA_API_KEY;
  const groqKeys = parseKeys(process.env.GROQ_API_KEYS);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (groqKeys.length === 0) {
    return res.status(500).json({ error: 'مفاتيح Groq مفقودة في إعدادات Vercel' });
  }

  // ── 1. RAG: البحث في ملفات الطالب ──
  let context = '';
  let sourcesUsed = 'general';

  if (useFiles && jinaKey && supabaseUrl) {
    try {
      const query = `${subject} ${topic}`.trim() || 'أسئلة طبية';
      const embRes = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jinaKey}` },
        body: JSON.stringify({ model: 'jina-embeddings-v3', input: [query], task: 'retrieval.query', dimensions: 1024 }),
      });
      const embData = await embRes.json();

      if (embRes.ok && embData.data?.[0]?.embedding) {
        const searchRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
          method: 'POST',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query_embedding: embData.data[0].embedding, match_threshold: 0.1, match_count: 10, filter_user_id: userId }),
        });
        const matches = await searchRes.json();

        if (Array.isArray(matches) && matches.length > 0) {
          context = matches.map((m, i) => `[مصدر ${i + 1} — ${m.filename}]:\n${m.content}`).join('\n\n---\n\n');
          sourcesUsed = 'files';
        }
      }
    } catch (err) {
      console.error('RAG search failed:', err);
    }
  }

  // ── 2. بناء الـ Prompt ──
  const systemPrompt = `أنت خبير في كتابة أسئلة الامتحان. أعد **JSON فقط** بدون أي نصوص أخرى أو علامات markdown.
صيغة JSON:
{
  "questions": [
    { "q": "نص السؤال", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "شرح قصير" }
  ]
}
ملاحظات: "correct" هو رقم الخيار الصحيح (0-3).${context ? `\n\nاستخدم هذه المقاطع كمصدر:\n${context}` : ''}`;

  const excludePart = excludeQuestions.length > 0
    ? `\n\nلا تكرر هذه الأسئلة:\n${excludeQuestions.slice(-10).map((q, i) => `${i + 1}. ${typeof q === 'string' ? q : q.q}`).join('\n')}`
    : '';

  const userPrompt = `أنشئ ${numQuestions} سؤال اختيار من متعدد (MCQ) في مادة ${subject} ${topic ? `عن موضوع ${topic}` : ''}.
مستوى الصعوبة: ${difficulty}.
التزم بـ ${numQuestions} سؤال بالضبط. أعد JSON فقط.${excludePart}`;

  // ── 3. استخدام نماذج Groq فقط ──
  const groqModels = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];
  let lastError = '';

  for (const key of groqKeys) {
    for (const model of groqModels) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.3,
            max_completion_tokens: 8000,
            response_format: { type: "json_object" } // إجبار Groq على إرجاع JSON
          }),
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          lastError = `HTTP ${r.status} - ${txt.slice(0, 100)}`;
          continue; 
        }

        const data = await r.json();
        let text = data.choices?.[0]?.message?.content || '';

        // تنظيف احتياطي
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          lastError = `JSON غير صالح من ${model}`;
          continue;
        }

        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          lastError = 'الرد لا يحتوي على مصفوفة أسئلة';
          continue;
        }

        const validQuestions = parsed.questions.filter(q =>
          q.q && Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
        );

        if (validQuestions.length === 0) {
          lastError = 'الأسئلة لا تتوافق مع الصيغة';
          continue;
        }

        // نجح التوليد!
        return res.status(200).json({ success: true, model, sourcesUsed, questions: validQuestions });

      } catch (err) {
        lastError = err.message;
      }
    }
  }

  return res.status(500).json({ error: 'فشل التوليد من Groq', details: lastError });
}