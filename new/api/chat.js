import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const providers = [
  {
    name: 'gemini',
    call: async (prompt, systemPrompt) => {
      const key = process.env.GEMINI_KEY;
      if (!key) throw new Error('Gemini key missing');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  },
  {
    name: 'groq',
    call: async (prompt, systemPrompt) => {
      const key = process.env.GROQ_KEY;
      if (!key) throw new Error('Groq key missing');
      const groq = new Groq({ apiKey: key });
      const chat = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      });
      return chat.choices[0].message.content;
    },
  },
  {
    name: 'openrouter',
    call: async (prompt, systemPrompt) => {
      const key = process.env.OPENROUTER_KEY;
      if (!key) throw new Error('OpenRouter key missing');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://coach-ai.vercel.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await res.json();
      if (!data.choices?.[0]) throw new Error('OpenRouter error response');
      return data.choices[0].message.content;
    },
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { prompt, systemPrompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const errors = [];
  for (const provider of providers) {
    try {
      const text = await provider.call(prompt, systemPrompt || '');
      return res.status(200).json({ text, provider: provider.name });
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
    }
  }
  return res.status(502).json({ error: 'تعذر الاتصال بجميع المزودين', details: errors });
}