// api/data-pipeline.js – مسار معالجة واستيراد المناهج الطبية الخام (Data Pipeline)
// يقوم باستلام النصوص الخام للمحاضرات الطبية، تطبيق التقطيع الهيكلي، وتوليد embeddings واستخراج الجراف وتخزينها تلقائياً

import { saveExtractedGraph } from './db/neo4j.js';

// دالة التقطيع الهيكلي (Structural Chunking)
function structuralChunkText(text, maxChunkSize = 1000, overlap = 150) {
  if (!text) return [];
  const cleanText = text.replace(/\r\n/g, '\n');
  const paragraphs = cleanText.split(/\n\s*\n/).filter(Boolean);
  const chunks = [];
  
  for (const para of paragraphs) {
    if (para.length <= maxChunkSize) {
      if (para.trim().length > 30) chunks.push(para.trim());
    } else {
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + maxChunkSize, para.length);
        const chunk = para.slice(start, end).trim();
        if (chunk.length > 30) chunks.push(chunk);
        if (end >= para.length) break;
        start = end - overlap;
      }
    }
  }
  
  if (chunks.length === 0) {
    let start = 0;
    while (start < cleanText.length) {
      const end = Math.min(start + maxChunkSize, cleanText.length);
      const chunk = cleanText.slice(start, end).trim();
      if (chunk.length > 30) chunks.push(chunk);
      if (end >= cleanText.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}

// توليد Embeddings عبر Jina AI
async function generateEmbeddings(texts, jinaKey) {
  const r = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jinaKey}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: texts,
      task: 'retrieval.passage',
      dimensions: 1024,
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.detail || data?.error?.message || `Jina HTTP ${r.status}`);
  }
  return data.data.map(d => d.embedding);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, rawText, subject, year } = req.body || {};
  if (!filename || !rawText) {
    return res.status(400).json({ error: 'اسم الملف (filename) والنص الخام (rawText) أصول أساسية مطلوبة' });
  }

  const jinaKey = process.env.JINA_API_KEY;
  const groqKey = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',')[0].trim() : null;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!jinaKey || !groqKey || !supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'متغيرات البيئة الأساسية غير مكتملة (JINA, GROQ, SUPABASE)' });
  }

  try {
    // 1. التقطيع الهيكلي للنص
    const chunks = structuralChunkText(rawText);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'النص المدخل قصير جداً أو لم ينتج عنه أجزاء صالحة' });
    }

    // 2. توليد embeddings للأجزاء دفعات
    const embeddings = await generateEmbeddings(chunks, jinaKey);

    // 3. تخزين المستند في Supabase
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${req.headers.authorization?.replace('Bearer ', '') || ''}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        filename,
        file_size: rawText.length,
        file_type: 'medical_curriculum',
        status: 'processed'
      })
    });

    const docData = await docRes.json();
    const documentId = Array.isArray(docData) ? docData[0]?.id : docData?.id;

    // 4. تخزين الأجزاء مع المتجهات في قاعدة البيانات
    const chunkInserts = chunks.map((chunk, idx) => ({
      document_id: documentId,
      content: chunk,
      embedding: embeddings[idx],
      metadata: { subject: subject || 'عام', year: year || 'غير محدد' }
    }));

    await fetch(`${supabaseUrl}/rest/v1/document_chunks`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${req.headers.authorization?.replace('Bearer ', '') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunkInserts)
    });

    // 5. استخراج الكيانات والعلاقات وتخزينها في Neo4j (GraphRAG)
    let graphStats = { success: false, operations: 0 };
    try {
      const graphPrompt = `
استخرج الكيانات الطبية (Drugs, Diseases, Symptoms) والعلاقات بينها بصيغة JSON:
{
  "entities": [{ "name": "...", "type": "Drug | Disease | Symptom" }],
  "relations": [{ "source": "...", "target": "...", "relation": "..." }]
}
النص: """${rawText.slice(0, 4000)}"""
      `;
      const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: graphPrompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });
      const gData = await gRes.json();
      const parsedGraph = JSON.parse(gData.choices[0].message.content);
      if (parsedGraph.entities && parsedGraph.relations) {
        const dbRes = await saveExtractedGraph(parsedGraph.entities, parsedGraph.relations);
        graphStats = { success: dbRes.success, operations: dbRes.operations };
      }
    } catch (gErr) {
      console.warn('⚠️ تحذير: فشل استخراج أو حفظ الجراف أثناء الرفع:', gErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'تمت معالجة واستيراد المنهج الطبي بنجاح عبر مسار البيانات (Data Pipeline)',
      filename,
      total_chunks: chunks.length,
      graph_stats: graphStats
    });

  } catch (err) {
    console.error('Data Pipeline Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
