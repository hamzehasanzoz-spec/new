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
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
    return new Response(JSON.stringify({ error: 'messages or prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = process.env.OPENROUTER_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_KEY مفقود' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // الأسرع أولًا
  const models = [
    'nvidia/nemotron-3.5-lightning:free',
    'nvidia/nemotron-3-super:free',
    'thinkingmachines/inkling-small:free',
    'thinkingmachines/inkling:free',
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
          stream: true,
        }),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        errors.push(`${model}: HTTP ${r.status} ${txt.slice(0, 80)}`);
        continue;
      }

      // مرّر البث مباشرة
      return new Response(r.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  return new Response(
    JSON.stringify({ error: 'تعذر الاتصال بجميع النماذج', details: errors }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  );
}