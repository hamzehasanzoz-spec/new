// api/graph-search.js – وحدة الاستعلام المباشر من قاعدة بيانات المعرفة (Neo4j Graph Search)
// تتيح جلب العلاقات الطبية (الأدوية، الأمراض، الأعراض) مباشرة لتوفير التوكنز وتوحيد الإجابات

import { searchGraph } from './db/neo4j.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, limit = 5 } = req.body || {};
  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({ error: 'الرجاء إرسال كلمة مفتاحية صحيحة للبحث في الجراف (keyword)' });
  }

  try {
    const graphData = await searchGraph(keyword.trim(), parseInt(limit) || 5);

    if (!graphData.success || !graphData.results || graphData.results.length === 0) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'لا توجد علاقات مسجلة مسبقاً في قاعدة المعرفة لهذا الكيان.',
        results: []
      });
    }

    // تنسيق النتائج بشكل احترافي ومباشر للاستخدام الفوري في الإجابة
    const formattedResults = graphData.results.map(item => ({
      entity: item.node,
      relation: item.relation,
      connected_entity: item.connectedNode
    }));

    return res.status(200).json({
      success: true,
      found: true,
      keyword: keyword.trim(),
      count: formattedResults.length,
      graph_context: formattedResults
    });

  } catch (err) {
    console.error('Graph Search API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
