export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, systemPrompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const errors = [];

  // ── المزود 1: Gemini (النموذج الجديد) ──
  if (process.env.GEMINI_KEY) {
    try {
      const key = process.env.GEMINI_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;
      const body = {
        contents: [{
          role: 'user',
          parts: [{ text: systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt }]
        }]
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || `HTTP ${r.status}`);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('رد فارغ من Gemini');
      return res.status(200).json({ text, provider: 'gemini' });
    } catch (err) {
      errors.push(`gemini: ${err.message}`);
    }
  } else {
    errors.push('gemini: مفتاح مفقود');
  }

  // ── المزود 2: OpenRouter (DeepSeek + Llama) ──
  if (process.env.OPENROUTER_KEY) {
    try {
      const key = process.env.OPENROUTER_KEY;
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://new-udf9.vercel.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [
            { role: 'system', content: systemPrompt || '' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.choices?.[0]) {
        throw new Error(data?.error?.message || 'OpenRouter error');
      }
      return res.status(200).json({
        text: data.choices[0].message.content,
        provider: 'openrouter-deepseek',
      });
    } catch (err) {
      errors.push(`openrouter: ${err.message}`);
    }
  } else {
    errors.push('openrouter: مفتاح مفقود');
  }

  // ── المزود 3: Groq ──
  if (process.env.GROQ_KEY) {
    try {
      const key = process.env.GROQ_KEY;
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt || '' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.choices?.[0]) {
        throw new Error(data?.error?.message || 'Groq error');
      }
      return res.status(200).json({
        text: data.choices[0].message.content,
        provider: 'groq',
      });
    } catch (err) {
      errors.push(`groq: ${err.message}`);
    }
  } else {
    errors.push('groq: مفتاح مفقود');
  }

  return res.status(502).json({
    error: 'تعذر الاتصال بجميع المزودين',
    details: errors,
  });
}