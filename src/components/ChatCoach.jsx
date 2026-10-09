import React, { useState, useRef, useEffect } from 'react';
import { askAI } from '../lib/aiProviders';
import { buildSystemPrompt } from '../lib/buildSystemPrompt';

export default function ChatCoach({ profile }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `أهلاً ${profile?.full_name ? profile.full_name : 'يا زميلي'}! 👋\nأنا كوتش AI، جاهز لمساعدتك في التحضير للامتحان الوطني. اسألني أي سؤال طبي.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    const newUserMsg = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // 1. بناء system prompt مخصص من بيانات الطالب
      const systemPrompt = buildSystemPrompt(profile);

      // 2. آخر 10 رسائل فقط (لتسريع الاستجابة)
      const recentHistory = updatedMessages
        .filter(m => m.role !== 'system')
        .slice(-10);

      // 3. تجميع الرسائل للإرسال
      const payload = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
      ];

      const response = await askAI(payload);

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.text },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'عذراً، حدث خطأ في الاتصال بالخدمة الذكية. حاول مجدداً.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '20px auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 18,
          background: '#2A5C82',
          color: '#fff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '1.4em' }}>🩺</span>
        <div>
          <div style={{ fontWeight: 'bold' }}>Coach AI</div>
          <div style={{ fontSize: '0.78em', opacity: 0.85 }}>
            {profile?.full_name ? `مخصص لـ ${profile.full_name}` : 'مساعدك للامتحان الوطني'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 15,
          background: '#F8FAFC',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
              background: msg.role === 'user' ? '#EFF6FF' : '#fff',
              color: '#1E293B',
              padding: '12px 18px',
              borderRadius: 12,
              maxWidth: '78%',
              boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
              textAlign: 'right',
            }}
          >
            <p
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                fontSize: '0.95em',
              }}
            >
              {msg.content}
            </p>
          </div>
        ))}

        {loading && (
          <div
            style={{
              alignSelf: 'flex-end',
              color: '#64748B',
              fontStyle: 'italic',
              fontSize: '0.9em',
            }}
          >
            كوتش AI يكتب...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: 15,
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          gap: 10,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب سؤالك الطبي..."
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            outline: 'none',
            fontSize: '0.95em',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#94A3B8' : '#2A5C82',
            color: '#fff',
            border: 'none',
            padding: '0 24px',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}