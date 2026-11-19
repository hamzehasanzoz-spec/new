// api/rerank.js – وحدة إعادة الترتيب (Reranking Pipeline)
// تقوم بتقييم وترتيب النتائج المسترجعة بدقة عالية لضمان اختيار الأجزاء الأكثر صلة فقط قبل إرسالها للنموذج

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, documents, topN = 5 } = req.body || {};
  
  if (!query || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'الرجاء إرسال الاستعلام (query) ومصفوفة المستندات (documents)' });
  }

  // استخدام نموذج مجاني سريع أو تقييم ذكي عبر Groq للترتيب في حال عدم توفر خدمة رانكر خارجية مخصصة
  const groqKey = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',')[0].trim() : null;
  if (!groqKey) {
    return res.status(500).json({ error: 'مفتاح GROQ_API_KEYS غير متوفر' });
  }

  const prompt = `
أنت مدقق ومقيم دقيق للنصوص الطبية.
لديك استعلام بحثي ومجموعة من المقتطفات المسترجعة. مهمتك هي تقييم مدى صلة كل مقتطف بالاستعلام وترتيبها تنازلياً من الأكثر صلة إلى الأقل صلة.
أجب حصرياً بصيغة JSON صحيحة تتضمن مصفوفة تحتوي على المعرفات (indices) للمستندات مرتبة من الأفضل إلى الأسوأ مع نقاط الصلة (relevance_score من 0 إلى 1):
{
  "ranked_indices": [
    { "index": 0, "score": 0.95 },
    { "index": 2, "score": 0.80 }
  ]
}

الاستعلام: "${query}"

المستندات المراد ترتيبها:
${documents.map((doc, idx) => `[${idx}]: ${doc.content || doc}`).join('\n\n')}
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // نموذج سريع وخفيف لعمليات إعادة الترتيب
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Rerank API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    // ترتيب المستندات الأصلية بناءً على النتائج
    const rankedDocs = (result.ranked_indices || [])
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(item => ({
        ...documents[item.index],
        relevance_score: item.score
      }));

    return res.status(200).json({
      success: true,
      ranked_documents: rankedDocs,
    });

  } catch (err) {
    console.error('Rerank Error:', err);
    // في حال حدوث خطأ، نعيد أول مستندات كحماية احتياطية (Fallback)
    return res.status(200).json({
      success: true,
      ranked_documents: documents.slice(0, topN),
      fallback: true,
    });
  }
}
