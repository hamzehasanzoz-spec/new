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
  } = req.body || {};

  const openrouterKey = process.env.OPENROUTER_KEY;
  if (!openrouterKey) {
    return res.status(500).json({ error: 'OPENROUTER_KEY مفقود' });
  }

  const voyageKey = process.env.VOYAGE_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // ── 1. RAG: البحث في ملفات الطالب ──
  let context = '';
  let sourcesUsed = 'general';

  if (useFiles && voyageKey && supabaseUrl) {
    try {
      const query = `${subject} ${topic}`.trim() || 'أسئلة طبية';
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

      if (embRes.ok && embData.data?.[0]?.embedding) {
        const searchRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query_embedding: embData.data[0].embedding,
            match_threshold: 0.1,
            match_count: 10,
            filter_user_id: userId,
          }),
        });
        const matches = await searchRes.json();

        if (Array.isArray(matches) && matches.length > 0) {
          context = matches
            .map((m, i) => `[مصدر ${i + 1} — ${m.filename}]:\n${m.content}`)
            .join('\n\n---\n\n');
          sourcesUsed = 'files';
        }
      }
    } catch (err) {
      console.error('RAG search failed:', err);
    }
  }

  // ── 2. بناء الـ Prompt ──
  const systemPrompt = `أنت خبير في كتابة أسئلة الامتحان الوطني السوري (NMLE) لطلاب الطب.

## قواعد صارمة
1. أعد **JSON فقط** — بدون أي نص خارجه، بدون markdown code fences.
2. لا ترحيب، لا شرح خارج JSON، لا مقدمة.
3. التزم بالعدد المطلوب بالضبط.

## صيغة JSON المطلوبة
{
  "questions": [
    {
      "q": "نص السؤال بالعربية والمصطلحات بالإنجليزية",
      "options": ["الخيار A", "الخيار B", "الخيار C", "الخيار D"],
      "correct": 0,
      "explanation": "شرح مختصر لسبب صحة الإجابة (سطر واحد)"
    }
  ]
}

ملاحظات:
- "correct" هو فهرس الإجابة الصحيحة (0-3).
- شرح كل سؤال في سطر واحد فقط.
- الأسئلة بصيغة سريرية عملية إن أمكن.${context ? `\n\n## مقاطع من ملفات الطالب (استخدمها كمصدر أساسي للأسئلة)\n\n${context}` : ''}`;

    const userPrompt = `أنشئ ${numQuestions} سؤال MCQ${subject ? ` في مادة **${subject}**` : ''}${topic ? ` عن موضوع "${topic}"` : ''}.
مستوى الصعوبة: ${difficulty}.

⚠️ **مهم جدًا:**
- التزم بـ **${numQuestions} سؤال بالضبط** — لا أقل ولا أكثر.
- عدّ الأسئلة في JSON قبل الإرجاع.
- إذا وصلت إلى ${numQuestions} سؤال، **توقف**.
- أعد JSON فقط بدون أي نص خارجه.`;

  // ── 3. استدعاء النماذج ──
    const models = [
    'nvidia/nemotron-3-ultra-550b-a55b:free',   // الأقوى (بطيء لكن دقيق)
    'nvidia/nemotron-3-super-120b-a12b:free',   // متوازن
    'google/gemma-4-31b-it:free',               // احتياطي
  ];

  let lastError = '';

  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://new-theta-five-73.vercel.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 10000,
        }),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        lastError = `HTTP ${r.status} ${txt.slice(0, 100)}`;
        continue;
      }

      const data = await r.json();
      let text = data.choices?.[0]?.message?.content || '';

      // تنظيف: إزالة markdown fences
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // استخراج أول JSON
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) {
        lastError = 'لا يوجد JSON';
        continue;
      }

      const jsonStr = text.slice(start, end + 1);
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        lastError = `JSON غير صالح: ${e.message}`;
        continue;
      }

      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        lastError = 'الرد بدون questions';
        continue;
      }

      // تحقق من صحة كل سؤال
      const validQuestions = parsed.questions.filter(q =>
        q.q && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
      );

      if (validQuestions.length === 0) {
        lastError = 'لا يوجد سؤال صالح';
        continue;
      }

      return res.status(200).json({
        success: true,
        model,
        sourcesUsed,
        contextUsed: context ? context.slice(0, 200) + '...' : null,
        questions: validQuestions,
      });
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({ error: 'فشل التوليد', details: lastError });
}