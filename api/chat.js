export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // يدعم شكلين: { messages: [...] } الجديد، أو { prompt, systemPrompt } القديم
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
  if (!key) {
    return res.status(500).json({ error: 'OPENROUTER_KEY مفقود في Vercel' });
  }

  const models = [
    'nvidia/nemotron-3-super:free',
    'thinkingmachines/inkling:free',
    'nvidia/nemotron-3-ultra:free',
    'nvidia/nemotron-3.5-lightning:free',
    'thinkingmachines/inkling-small:free',
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
          max_tokens: 4000,
        }),
      });

      const data = await r.json();

      if (r.ok && data?.choices?.[0]?.message?.content) {
        return res.status(200).json({
          text: data.choices[0].message.content,
          provider: model,
        });
      }

      errors.push(`${model}: ${data?.error?.message || 'HTTP ' + r.status}`);
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  return res.status(502).json({
    error: 'تعذر الاتصال بجميع النماذج',
    details: errors,
  });
}