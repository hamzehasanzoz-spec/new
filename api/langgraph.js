import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// 1. تعريف الحالة
export const AgentState = Annotation.Root({
  question: Annotation({ reducer: (_, update) => update, default: () => "" }),
  originalQuestion: Annotation({ reducer: (_, update) => update, default: () => "" }),
  retrievedChunks: Annotation({ reducer: (_, update) => update, default: () => [] }),
  finalAnswer: Annotation({ reducer: (_, update) => update, default: () => "" }),
  retryCount: Annotation({ reducer: (x, y) => y, default: () => 0 }),
  grade: Annotation({ reducer: (_, update) => update, default: () => "" }),
});

// دالة مساعدة لاستدعاء Groq مباشرة (لتجنب مشاكل fetch الداخلية)
async function askGroq(prompt, systemPrompt) {
  const groqKeys = process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(',') : [];
  if (groqKeys.length === 0) throw new Error("GROQ_API_KEYS missing");

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKeys[0].trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // نموذج سريع جداً
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// العقدة 1: البحث
const searchNode = async (state) => {
  console.log("🔍 Searching for:", state.question);
  // سنستخدم بحث مبسط هنا لتجنب مشاكل الاتصال
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    // بحث نصي بسيط (يمكنك تطويره لاحقاً لاستخدام pgvector)
    const res = await fetch(`${supabaseUrl}/rest/v1/document_chunks?select=content&content=ilike.%25${state.question}%25&limit=5`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    return { retrievedChunks: data.map(d => ({ content: d.content })) };
  } catch (e) {
    return { retrievedChunks: [] };
  }
};

// العقدة 2: التقييم
const gradeNode = async (state) => {
  if (!state.retrievedChunks || state.retrievedChunks.length === 0) return { grade: "no" }; 
  
  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n").slice(0, 2000);
  const prompt = `هل النصوص التالية تجيب على السؤال: "${state.question}"؟\nالنصوص:\n${contextText}\nأجب بـ "yes" أو "no" فقط.`;
  
  const result = await askGroq(prompt, "أنت خبير تقييم.");
  return { grade: result.toLowerCase().includes("yes") ? "yes" : "no" };
};

// العقدة 3: إعادة الصياغة
const rewriteNode = async (state) => {
  const prompt = `أعد صياغة السؤال التالي ليكون أفضل للبحث:\n"${state.question}"`;
  const newQuestion = await askGroq(prompt, "أجب بالسؤال الجديد فقط.");
  return { question: newQuestion, retryCount: state.retryCount + 1 };
};

// العقدة 4: التوليد
const generateNode = async (state) => {
  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n");
  let systemPrompt = contextText 
    ? `أجب على السؤال بناءً على النصوص التالية فقط:\n${contextText}\nإذا لم تجد الإجابة، قل: "المعلومة غير موجودة".`
    : `أجب على السؤال من خلال معرفتك الطبية العامة.`;
    
  const finalAnswer = await askGroq(state.originalQuestion, systemPrompt);
  return { finalAnswer: finalAnswer };
};

// بناء الرسم البياني
const workflow = new StateGraph(AgentState)
  .addNode("search", searchNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("generate", generateNode)
  .addEdge(START, "search")
  .addEdge("search", "grade")
  .addConditionalEdges("grade", (state) => {
    return (state.grade === "yes" || state.retryCount >= 1) ? "generate" : "rewrite";
  })
  .addEdge("rewrite", "search")
  .addEdge("generate", END);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });

    const app = workflow.compile();
    const result = await app.invoke({ question: query, originalQuestion: query, retryCount: 0 });

    return res.status(200).json({ success: true, finalAnswer: result.finalAnswer });
  } catch (err) {
    console.error("LangGraph Crash:", err);
    // إرجاع الخطأ كـ JSON لكي لا تنهار الواجهة
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}