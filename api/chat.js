export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, systemPrompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const errors = [];
  const systemText = systemPrompt || 'You are a helpful medical assistant.';

  // ── Provider 1: Gemini (New Model) ──
  if (process.env.GEMINI_KEY) {
    try {
      const key = process.env.GEMINI_KEY;
      const model = 'gemini-3.8-flash'; // ✅ النموذج الجديد
      const url = `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: AQ.Ab8RN6I1O3tb_fCoBXrLTvSfO0tz-CzPS-2eUsj4Ccejq3bDgA' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: `${systemText}\n\n---\n\n${prompt}` }] }]
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ text: data.candidates[0].content.parts[0].text, provider: `gemini-${model}` });
      }
      errors.push(`gemini: ${data?.error?.message || 'HTTP ' + r.status}`);
    } catch (err) { errors.push(`gemini: ${err.message}`); }
  } else { errors.push('gemini: GEMINI_KEY مفقود'); }

  // ── Provider 2: OpenRouter (DeepSeek) ──
  if (process.env.OPENROUTER_KEY) {
    try {
      const model = 'deepseek/deepseek-chat-v3.1:free'; // ✅ نموذج DeepSeek المجاني
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://new-udf9.vercel.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemText }, { role: 'user', content: prompt }],
        }),
      });
      const data = await r.json();
      if (r.ok && data?.choices?.[0]) {
        return res.status(200).json({ text: data.choices[0].message.content, provider: 'openrouter' });
      }
      errors.push(`openrouter: ${data?.error?.message || 'HTTP ' + r.status}`);
    } catch (err) { errors.push(`openrouter: ${err.message}`); }
  } else { errors.push('openrouter: OPENROUTER_KEY مفقود'); }

  // ── Provider 3: Groq ──
  if (process.env.GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemText }, { role: 'user', content: prompt }],
        }),
      });
      const data = await r.json();
      if (r.ok && data?.choices?.[0]) {
        return res.status(200).json({ text: data.choices[0].message.content, provider: 'groq' });
      }
      errors.push(`groq: ${data?.error?.message || 'HTTP ' + r.status}`);
    } catch (err) { errors.push(`groq: ${err.message}`); }
  } else { errors.push('groq: GROQ_KEY مفقود'); }

  return res.status(502).json({ error: 'تعذر الاتصال بجميع المزودين', details: errors });
}
