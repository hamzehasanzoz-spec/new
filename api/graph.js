// api/graph.js – وحدة استخراج الكيانات والعلاقات وتخزينها في GraphRAG (Neo4j)
import { saveExtractedGraph } from './db/neo4j.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, saveToDb = true } = req.body || {};
  if (!text || text.trim().length < 10) {
    return res.status(400).json({ error: 'النص المطلوب استخراج الكيانات منه قصير جداً أو مفقود' });
  }

  const groqKey = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',')[0].trim() : null;
  if (!groqKey) {
    return res.status(500).json({ error: 'مفتاح GROQ_API_KEYS غير متوفر في البيئة' });
  }

  const prompt = `
أنت خبير في استخراج المعرفة الطبية (Medical Knowledge Graph Extraction).
قم بتحليل النص التالي واستخرج الكيانات الطبية الأساسية (مثل: الأدوية Drugs، الأمراض Diseases، الأعراض Symptoms) والعلاقات بينها.
أجب حصرياً بصيغة JSON صحيحة وفقاً للهيكل التالي دون أي نصوص إضافية:
{
  "entities": [
    { "name": "اسم الكيان", "type": "Drug | Disease | Symptom" }
  ],
  "relations": [
    { "source": "الكيان الأول", "target": "الكيان الثاني", "relation": "يعالج / يسبب / أعراض لـ" }
  ]
}

النص المراد تحليله:
"""
${text.slice(0, 3000)}
"""
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const resultJson = JSON.parse(data.choices[0].message.content);

    let dbResult = null;
    // تخزين النتائج في قاعدة بيانات Neo4j إذا كان الخيار مفعلًا
    if (saveToDb && resultJson.entities && resultJson.relations) {
      try {
        dbResult = await saveExtractedGraph(resultJson.entities, resultJson.relations);
      } catch (dbErr) {
        console.warn('⚠️ تعذر الحفظ في Neo4j، سيتم إرجاع النتائج المستخرجة فقط:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      graph: resultJson,
      neo4j_stored: !!dbResult && dbResult.success,
      db_operations: dbResult?.operations || 0
    });

  } catch (err) {
    console.error('GraphRAG Extraction Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
