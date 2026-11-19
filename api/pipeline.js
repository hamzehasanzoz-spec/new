// api/pipeline.js – المنسق العام لنظام RAG متعدد الطبقات (Modular RAG Pipeline)
// يربط محطات النظام الست معاً: التقطيع، البحث الهجين، الرسم البياني، إعادة الترتيب، والإجابة الموثوقة

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, userId, accessToken } = req.body || {};
  if (!query || !userId || !accessToken) {
    return res.status(400).json({ error: 'البيانات الأساسية مطلوبة (query, userId, accessToken)' });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const apiHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };

  try {
    // 1️⃣ المحطة الأولى والثانية: البحث الهجين (Hybrid Search) واسترجاع النصوص
    const searchRes = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ query, matchCount: 15, threshold: 0.1 })
    });
    const searchData = await searchRes.json();
    let documents = searchData.matches || [];

    // 2️⃣ المحطة الرابعة: استخراج المعرفة والكيانات (GraphRAG) لتعزيز السياق
    let graphContext = '';
    try {
      const graphRes = await fetch(`${baseUrl}/api/graph`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ text: query })
      });
      const graphData = await graphRes.json();
      if (graphData.success && graphData.graph) {
        const entities = (graphData.graph.entities || []).map(e => `${e.name} (${e.type})`).join(', ');
        const relations = (graphData.graph.relations || []).map(r => `${r.source} -> ${r.relation} -> ${r.target}`).join('; ');
        graphContext = `[الكيانات المرتبطة: ${entities}] [العلاقات: ${relations}]`;
      }
    } catch (e) {
      console.warn('GraphRAG step skipped or failed:', e.message);
    }

    // 3️⃣ المحطة الخامسة: إعادة الترتيب واختيار الأفضل (Reranking)
    let finalContexts = documents;
    if (documents.length > 0) {
      try {
        const rerankRes = await fetch(`${baseUrl}/api/rerank`, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ query, documents, topN: 5 })
        });
        const rerankData = await rerankRes.json();
        if (rerankData.success && rerankData.ranked_documents) {
          finalContexts = rerankData.ranked_documents;
        }
      } catch (e) {
        console.warn('Rerank step skipped, using default top matches:', e.message);
        finalContexts = documents.slice(0, 5);
      }
    }

    // تجهيز السياق النهائي للإرسال إلى نموذج الدردشة
    const contextText = finalContexts.map(d => d.content || d).join('\n\n---\n\n');
    const enrichedContext = graphContext ? `${graphContext}\n\n${contextText}` : contextText;

    // 4️⃣ المحطة السادسة: صياغة الرد الآمن عبر chat API مع Grounded Prompt
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        prompt: `سؤال الطالب: ${query}\n\nالمراجع والسياق المسترجع:\n${enrichedContext}`
      })
    });

    if (!chatRes.ok) {
      throw new Error('فشل توليد الرد من نموذج الذكاء الاصطناعي');
    }

    // إرجاع النتيجة النهائية للعميل
    return res.status(200).json({
      success: true,
      query,
      contexts_used: finalContexts.length,
      graph_enriched: !!graphContext,
      response_stream: chatRes.body
    });

  } catch (err) {
    console.error('Modular RAG Pipeline Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
