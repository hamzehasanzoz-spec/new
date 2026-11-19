import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  question: Annotation({ reducer: (_, update) => update, default: () => "" }),
  retrievedChunks: Annotation({ reducer: (_, update) => update, default: () => [] }),
  finalAnswer: Annotation({ reducer: (_, update) => update, default: () => "" }),
  accessToken: Annotation({ reducer: (_, update) => update, default: () => "" }),
  baseUrl: Annotation({ reducer: (_, update) => update, default: () => "" }),
});

const searchNode = async (state) => {
  console.log("🔍 [LangGraph] Searching...");
  const res = await fetch(`${state.baseUrl}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ query: state.question, matchCount: 5, threshold: 0.1 }) // قللنا العدد للسرعة
  });
  const data = await res.json();
  return { retrievedChunks: data.matches || [] };
};

const generateNode = async (state) => {
  console.log("✍️ [LangGraph] Generating...");
  const contextText = state.retrievedChunks.map(c => c.content).join("\n\n");
  
  // التوجيه الذكي: هل لدينا ملفات أم لا؟
  let systemPrompt = '';
  if (state.retrievedChunks.length > 0) {
    // إذا وجدنا ملفات، نطبق التعليمات الصارمة
    systemPrompt = `أنت مساعد طبي. أجب على السؤال بناءً على النصوص المرفقة فقط.
    النصوص: ${contextText}
    إذا لم تجد الإجابة في النصوص، قل: "المعلومة غير موجودة في الملفات".`;
  } else {
    // إذا لم نجد ملفات، أجب من المعرفة الطبية العامة
    systemPrompt = `أنت مساعد طبي ذكي لطلاب الطب. أجب على السؤال التالي من خلال معرفتك الطبية العامة، بأسلوب أكاديمي ومفصل.`;
  }
  
  const res = await fetch(`${state.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.accessToken}` },
    body: JSON.stringify({ 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.question }
      ] 
    })
  });
  
  const text = await res.text();
  return { finalAnswer: text };
};

const workflow = new StateGraph(AgentState)
  .addNode("search", searchNode)
  .addNode("generate", generateNode)
  .addEdge(START, "search")
  .addEdge("search", "generate")
  .addEdge("generate", END);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, accessToken } = req.body;
  if (!query || !accessToken) return res.status(400).json({ error: 'Missing query or token' });

  // تحديد الرابط بشكل صريح لتجنب مشاكل Vercel
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

  try {
    const app = workflow.compile();
    const result = await app.invoke({
      question: query,
      accessToken: accessToken,
      baseUrl: baseUrl,
    });

    return res.status(200).json({ success: true, finalAnswer: result.finalAnswer });
  } catch (err) {
    console.error("LangGraph Error:", err);
    return res.status(500).json({ error: err.message });
  }
}