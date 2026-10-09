export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let messages = [];
  if (Array.isArray(req.body?.messages)) {
    messages = req.body.messages;
  } else if (req.body?.prompt) {
    messages = [
      { role: 'system', content: req.body.systemPrompt || '' },
      { role: 'user', content: req.body.prompt },
    ];
  } else {
    return res.status(400).json({ error: 'messages or prompt is required' });
  }

  const key = process.env.OPENROUTER_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_KEY مفقود' });

  // الأسرع أولًا
  const models = [
    'nvidia/nemotron-3.5-lightning:free',   // ⚡ الأسرع
    'nvidia/nemotron-3-super:free',
    'thinkingmachines/inkling-small:free',
    'thinkingmachines/inkling:free',
    'nvidia/nemotron-3-ultra:free',
  ];

  const errors = [];

  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://new-udf9.vercel.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 2500,
          stream: true,   // ← بث مباشر
        }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        errors.push(`${model}: HTTP ${r.status} ${errText.slice(0, 100)}`);
        continue;
      }

      // إعدادات البث
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // إرسال اسم المزود كأول حدث
      res.write(`data: ${JSON.stringify({ provider: model })}\n\n`);

      // نقل البث مباشرة
      const reader = r.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }

      res.end();
      return;
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  res.status(502).json({ error: 'تعذر الاتصال بجميع النماذج', details: errors });
}