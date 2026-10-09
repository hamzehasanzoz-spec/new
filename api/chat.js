export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, systemPrompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const key = process.env.OPENROUTER_KEY;
  if (!key) {
    return res.status(500).json({ error: 'OPENROUTER_KEY مفقود في Vercel' });
  }

  const systemText = systemPrompt ||
    'أنت "Coach AI"، مدرب طبي ذكي لطلاب الطب في سوريا. أجب بالعربية الفصحى المبسطة، وبنقاط منظمة، واعتمد على المراجع الطبية المعتمدة.';

  // النماذج بالترتيب — يجرب الأول، إن فشل ينتقل للتالي
  const models = [
    'thinkingmachines/inkling',
    'nvidia/nemotron-3-super',
    'nvidia/nemotron-3-ultra',
    'nvidia/nemotron-3.5-lightning',
    'thinkingmachines/inkling-small',
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
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
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
