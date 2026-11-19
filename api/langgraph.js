import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// ═══════════════════════════════════════════════════════════════
// 1. تعريف الحالة (State)
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

// دالة مساعدة لاستدعاء النموذج وقراءة الرد كنص عادي
async function callModel(prompt, systemPrompt, state) {
  const res = await fetch(`${state.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ] 
    })
  });
  
  const rawStream = await res.text();
  let finalText = '';
  const lines = rawStream.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta;
        if (delta && delta.content) finalText += delta.content;
      } catch (e) {}
    }
  }
  return finalText.trim();
}

// ═══════════════════════════════════════════════════════════════
// 2. العقد (Nodes)
// ═══════════════════════════════════════════════════════════════

// العقدة 1: البحث
const searchNode = async (state) => {
  console.log("🔍 [LangGraph] Searching for:", state.question);
  const res = await fetch(`${state.baseUrl}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ query: state.question, matchCount: 5, threshold: 0.1 })
  });
  const data = await res.json();
  return { retrievedChunks: data.matches || [] };
};

// العقدة 2: التقييم (Grader)
const gradeNode = async (state) => {
  console.log("⚖️ [LangGraph] Grading chunks...");
  if (!state.retrievedChunks || state.retrievedChunks.length === 0) {
    return { grade: "no" }; 
  }

  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n").slice(0, 2000);
  const systemPrompt = `أنت خبير تقييم طبي. أجب بكلمة واحدة فقط: "yes" أو "no".`;
  const prompt = `هل النصوص التالية تحتوي على إجابة لسؤال: "${state.question}"؟\n\nالنصوص:\n${contextText}`;

  const gradeText = await callModel(prompt, systemPrompt, state);
  const isGood = gradeText.toLowerCase().includes("yes");
  
  console.log("👉 Grade result:", isGood ? "YES" : "NO");
  return { grade: isGood ? "yes" : "no" };
};

// العقدة 3: إعادة صياغة السؤال (Rewrite)
const rewriteNode = async (state) => {
  console.log("🔄 [LangGraph] Rewriting question...");
  const systemPrompt = `أنت خبير في تحسين محركات البحث الطبية. أعد صياغة السؤال بكلمات مفتاحية طبية دقيقة. أجب بالسؤال الجديد فقط.`;
  const prompt = `السؤال: "${state.question}"`;
  
  const newQuestion = await callModel(prompt, systemPrompt, state);
  
  return { 
    question: newQuestion.trim(), 
    retryCount: state.retryCount + 1 
  };
};

// العقدة 4: التوليد النهائي (Generate)
const generateNode = async (state) => {
  console.log("✍️ [LangGraph] Generating final answer...");
  
  let systemPrompt = '';
  if (state.retrievedChunks && state.retrievedChunks.length > 0) {
    const contextText = state.retrievedChunks.map(c => c.content).join("\n\n");
    systemPrompt = `أنت مساعد طبي. أجب على السؤال بناءً على النصوص المرفقة فقط.\nالنصوص:\n${contextText}\n\nإذا لم تجد الإجابة في النصوص، قل: "المعلومة غير موجودة في الملفات".`;
  } else {
    systemPrompt = `أنت مساعد طبي ذكي. أجب على السؤال من خلال معرفتك الطبية العامة بأسلوب أكاديمي.`;
  }

  const finalAnswer = await callModel(state.originalQuestion, systemPrompt, state);
  return { finalAnswer: finalAnswer || "عذراً، حدث خطأ في التوليد." };
};

// ═══════════════════════════════════════════════════════════════
// 3. بناء الرسم البياني (Graph)
// ═══════════════════════════════════════════════════════════════
const workflow = new StateGraph(AgentState)
  .addNode("search", searchNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("generate", generateNode)

  .addEdge(START, "search")
  .addEdge("search", "grade")
  
  // الحافة الشرطية: هل نعيد الصياغة أم نكمل للتوليد؟
  .addConditionalEdges("grade", (state) => {
    // إذا كانت النتيجة جيدة، أو استنفدنا المحاولات (2 محاولات كحد أقصى)، نولد الإجابة
    if (state.grade === "yes" || state.retryCount >= 2) {
      return "generate"; 
    }
    // إذا كانت النتيجة سيئة، نعيد الصياغة والبحث
    return "rewrite"; 
  })
  
  .addEdge("rewrite", "search")
  .addEdge("generate", END);

// ═══════════════════════════════════════════════════════════════
// 4. الـ Handler
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, accessToken } = req.body;
  if (!query || !accessToken) return res.status(400).json({ error: 'Missing query or token' });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

  try {
    const app = workflow.compile();

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
      retries: result.retryCount
    });
  } catch (err) {
    console.error("LangGraph Error:", err);
    return res.status(500).json({ error: err.message });
  }
}