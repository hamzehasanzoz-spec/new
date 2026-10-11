// api/groq-proxy.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // استقبال جسم الطلب من الواجهة الأمامية
  const body = await req.json();

  // التحقق من وجود مفتاح Groq في متغيرات البيئة
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY غير مهيأ في الخادم' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // تمرير الطلب إلى Groq مع المفتاح السري
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // إعادة استجابة Groq كما هي (بما في ذلك البث)
  return new Response(groqResponse.body, {
    status: groqResponse.status,
    headers: {
      'Content-Type': groqResponse.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}