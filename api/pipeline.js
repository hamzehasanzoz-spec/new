export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { query, accessToken } = await req.json();
  if (!query || !accessToken) {
    return new Response(JSON.stringify({ error: 'البيانات الأساسية مطلوبة' }), { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;
  const apiHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };

  try {
    // 1. البحث الهجين
    const searchRes = await fetch(`${baseUrl}/api/search`, {
      method: 'POST', headers: apiHeaders,
      body: JSON.stringify({ query, matchCount: 15, threshold: 0.1 })
    });
    const searchData = await searchRes.json();
    let documents = searchData.matches || [];

    // 2. الرسم البياني المعرفي (GraphRAG)
    let graphContext = '';
    try {
      const graphRes = await fetch(`${baseUrl}/api/graph-search`, {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ keyword: query, limit: 3 })
      });
      const graphData = await graphRes.json();
      if (graphData.found && graphData.graph_context?.length > 0) {
        graphContext = graphData.graph_context.map(g => `${g.entity?.name} -> ${g.relation} -> ${g.connected_entity?.name}`).join('\n');
      }
    } catch (e) { console.warn('GraphRAG skipped:', e.message); }

    // 3. إعادة الترتيب (Reranking)
    let finalContexts = documents;
    if (documents.length > 0) {
      try {
        const rerankRes = await fetch(`${baseUrl}/api/rerank`, {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ query, documents, topN: 5 })
        });
        const rerankData = await rerankRes.json();
        if (rerankData.success) finalContexts = rerankData.ranked_documents;
      } catch (e) {
        finalContexts = documents.slice(0, 5);
      }
    }

    const contextText = finalContexts.map(d => d.content || d).join('\n\n---\n\n');
    const enrichedContext = graphContext ? `[علاقات معرفية]: ${graphContext}\n\n${contextText}` : contextText;

    // 4. التوليد الآمن (Grounded Prompt)
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST', headers: apiHeaders,
      body: JSON.stringify({
        prompt: `سؤال الطالب: ${query}\n\nالمراجع:\n${enrichedContext}`
      })
    });

    if (!chatRes.ok) throw new Error('فشل التوليد من النموذج');

    // إرجاع البث مباشرة للعميل
    return new Response(chatRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}