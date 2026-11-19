import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// ═══════════════════════════════════════════════════════════════
// 1. تعريف الحالة (State): الذاكرة التي تنتقل بين الوكلاء
// ═══════════════════════════════════════════════════════════════
export const AgentState = Annotation.Root({
  question: Annotation({ reducer: (_, update) => update, default: () => "" }),
  originalQuestion: Annotation({ reducer: (_, update) => update, default: () => "" }),
  retrievedChunks: Annotation({ reducer: (_, update) => update, default: () => [] }),
  finalAnswer: Annotation({ reducer: (_, update) => update, default: () => "" }),
  retryCount: Annotation({ reducer: (x, y) => y, default: () => 0 }),
  grade: Annotation({ reducer: (_, update) => update, default: () => "" }),
  accessToken: Annotation({ reducer: (_, update) => update, default: () => "" }),
  baseUrl: Annotation({ reducer: (_, update) => update, default: () => "" }),
});

// ═══════════════════════════════════════════════════════════════
// 2. تعريف العقد (Nodes): الخطوات التي يقوم بها النظام
// ═══════════════════════════════════════════════════════════════

// العقدة 1: البحث في الملفات (Search)
const searchNode = async (state) => {
  console.log("🔍 [LangGraph] Starting Search Node for:", state.question);
  const res = await fetch(`${state.baseUrl}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ query: state.question, matchCount: 10, threshold: 0.1 })
  });
  const data = await res.json();
  return { retrievedChunks: data.matches || [] };
};

// العقدة 2: تقييم جودة النتائج (Grade) - العقل المدبر
const gradeNode = async (state) => {
  console.log("⚖️ [LangGraph] Grading retrieved chunks...");
  if (!state.retrievedChunks || state.retrievedChunks.length === 0) {
    return { grade: "no" }; // لا توجد نتائج، إذن التقييم سيئ
  }

  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n").slice(0, 3000);
  const prompt = `أنت خبير تقييم. هل النصوص التالية تجيب على سؤال الطالب: "${state.question}"؟
  النصوص:
  ${contextText}
  
  أجب بكلمة واحدة فقط: "yes" إذا كانت تجيب، أو "no" إذا كانت لا تجيب.`;

  const res = await fetch(`${state.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  // نقرأ الرد كاملاً (وليس Stream) لهذه الخطوة
  const text = await res.text();
  let gradeResult = "no";
  if (text.toLowerCase().includes("yes")) gradeResult = "yes";
  
  return { grade: gradeResult };
};

// العقدة 3: إعادة صياغة السؤال (Rewrite)
const rewriteNode = async (state) => {
  console.log("🔄 [LangGraph] Rewriting question...");
  const prompt = `أعد صياغة السؤال التالي ليكون أفضل للبحث في الكتب الطبية (استخدم مصطلحات طبية دقيقة):
  "${state.question}"`;

  const res = await fetch(`${state.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  
  const newQuestion = await res.text();
  return { 
    question: newQuestion.trim(), 
    retryCount: state.retryCount + 1 
  };
};

// العقدة 4: التوليد النهائي (Generate)
const generateNode = async (state) => {
  console.log("✍️ [LangGraph] Generating final answer...");
  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n");
  const prompt = `أجب على السؤال التالي بناءً على النصوص المرفقة فقط:
  السؤال: ${state.originalQuestion}
  النصوص: ${contextText}
  
  إذا لم تجد الإجابة في النصوص، قل: "المعلومة غير موجودة في الملفات".`;

  const res = await fetch(`${state.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  
  const finalAnswer = await res.text();
  return { finalAnswer: finalAnswer };
};

// ═══════════════════════════════════════════════════════════════
// 3. بناء الرسم البياني (StateGraph) وربط العقد
// ═══════════════════════════════════════════════════════════════
const workflow = new StateGraph(AgentState)
  .addNode("search", searchNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("generate", generateNode)

  // مسار التنفيذ
  .addEdge(START, "search")
  .addEdge("search", "grade")
  
  // الحافة الشرطية: إذا كانت النتيجة سيئة، أعد الصياغة والبحث. إذا كانت جيدة، ولّد الإجابة.
  .addConditionalEdges("grade", (state) => {
    if (state.grade === "yes" || state.retryCount >= 2) {
      return "generate"; // اذهب للتوليد
    }
    return "rewrite"; // أعد صياغة السؤال
  })
  
  .addEdge("rewrite", "search")
  .addEdge("generate", END);

// ═══════════════════════════════════════════════════════════════
// 4. الـ API Endpoint الذي ستستدعيه الواجهة
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, accessToken } = req.body;
  if (!query || !accessToken) return res.status(400).json({ error: 'Missing query or token' });

  // تحديد رابط الموقع الأساسي
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

  try {
    // تجميع الرسم البياني
    const app = workflow.compile();

    // تشغيل الوكيل
    const initialState = {
      question: query,
      originalQuestion: query,
      accessToken: accessToken,
      baseUrl: baseUrl,
      retryCount: 0
    };

    const result = await app.invoke(initialState);

    return res.status(200).json({
      success: true,
      finalAnswer: result.finalAnswer,
      retries: result.retryCount,
      grade: result.grade
    });
  } catch (err) {
    console.error("LangGraph Error:", err);
    return res.status(500).json({ error: err.message });
  }
}