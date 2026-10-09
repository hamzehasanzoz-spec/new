const systemPrompt = `أنت "Coach AI"، مدرب طبي ذكي لطلاب الطب في سوريا للتحضير للامتحان الوطني (NMLE).
- أجب بالعربية الفصحى المبسطة.
- رتب الإجابات: مقدمة قصيرة، نقاط، خلاصة.
- اعتمد على المراجع الطبية المعتمدة (Harrison, Bailey & Love, Kaplan...).
- إن طلب الطالب سؤال MCQ اشرح الإجابة الصحيحة والخيارات الخاطئة.`;
import React, { useState } from 'react';
import { askAI } from '../lib/aiProviders';

export default function ChatCoach({ session }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'أهلاً بك يا زميلي الطبيب! أنا كوتش AI، جاهز لمساعدتك في الإعداد للامتحان الوطني للطب في سورية. اسألني أي سؤال طبّي أو استفسر عن الدورات السابقة.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const systemPrompt = `أنت "Coach AI"، مدرب ومساعد ذكي طبي مخصص لمساعدة طلاب الطب في سوريا للتحضير للامتحان الوطني للطب (NMLE). كن دقيقاً، اعتمد على الدورات والمراجع الطبية المعتمدة، وقدم الإجابات بأسلوب منظم وداعم.`;
      
      const response = await askAI(userMessage, systemPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال بالخدمة الذكية. حاول مجدداً.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '70vh', direction: 'rtl' }}>
      <div style={{ padding: '20px', background: '#2A5C82', color: '#fff', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        <h3 style={{ margin: 0 }}>مساعد الامتحان الوطني للطب - Coach AI 🩺</h3>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#F8FAFC' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
            background: msg.role === 'user' ? '#EFF6FF' : '#FFFFFF',
            color: '#1E293B',
            padding: '12px 18px',
            borderRadius: '12px',
            maxWidth: '75%',
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
            border: '1px solid #E2E8F0',
            textAlign: 'right'
          }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.content}</p>
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-end', color: '#64748B', fontStyle: 'italic' }}>كوتش AI يكتب الرد...</div>}
      </div>

      <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب سؤالك الطبي أو استفسارك عن الدورات هنا..." 
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ background: '#2A5C82', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}