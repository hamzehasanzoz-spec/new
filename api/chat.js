export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  let messages = [];
  if (Array.isArray(body?.messages)) {
    messages = body.messages;
  } else if (body?.prompt) {
    messages = [
      { role: 'system', content: body.systemPrompt || '' },
      { role: 'user', content: body.prompt },
    ];
  } else {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_KEY;
  const errors = [];

  // ═══════════════════════════════════════════
  // 1️⃣ Groq (الأساسي — سريع وحد عالي)
  // ═══════════════════════════════════════════
  if (groqKey) {
    const groqModels = [
      'llama-3.3-70b-versatile',   // ⭐ الأفضل للطب العربي
      'llama-3.1-8b-instant',      // ⚡ احتياطي سريع
      'openai/gpt-oss-120b',       // 🧠 احتياطي ذكي
    ];

    for (const model of groqModels) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.4,
            max_completion_tokens: 4000,
            stream: true,
          }),
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          errors.push(`groq/${model}: HTTP ${r.status} ${txt.slice(0, 80)}`);
          continue;
        }

        return new Response(r.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Provider': 'groq',
            'X-Model': model,
          },
        });
      } catch (err) {
        errors.push(`groq/${model}: ${err.message}`);
      }
    }
  } else {
    errors.push('groq: GROQ_API_KEY مفقود');
  }

  // ═══════════════════════════════════════════
  // 2️⃣ OpenRouter (احتياطي)
  // ═══════════════════════════════════════════
  if (openrouterKey) {
    const orModels = [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
    ];

    for (const model of orModels) {
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
            messages,
            temperature: 0.4,
            max_tokens: 4000,
            stream: true,
          }),
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          errors.push(`or/${model}: HTTP ${r.status} ${txt.slice(0, 80)}`);
          continue;
        }

        return new Response(r.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Provider': 'openrouter',
            'X-Model': model,
          },
        });
      } catch (err) {
        errors.push(`or/${model}: ${err.message}`);
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: 'تعذر الاتصال بجميع المزودين',
      details: errors,
    }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  );
}