import React, { useState, useRef, useEffect } from 'react';
import { buildSystemPrompt } from '../lib/buildSystemPrompt';

export default function ChatCoach({ profile }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `أهلاً ${profile?.full_name ? profile.full_name : 'يا زميلي'}! 👋\nأنا كوتش AI، جاهز لمساعدتك. اسألني أي سؤال طبي.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const setLastAssistant = (content) => {
    setMessages(prev => {
      const copy = [...prev];
      copy[copy.length - 1] = { role: 'assistant', content };
      return copy;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    const userMsg = { role: 'user', content: userMessage };
    const withUser = [...messages, userMsg];
    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(profile);
      const recent = withUser.slice(-10);
      const payload = [
        { role: 'system', content: systemPrompt },
        ...recent.map(m => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errMsg = errJson.error;
          if (errJson.details) errMsg += '\n' + errJson.details.join('\n');
        } catch {}
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error('لا يوجد بث');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let gotFirstChunk = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              gotFirstChunk = true;
              assistantText += delta;
              setLastAssistant(assistantText);
            }
          } catch {
            // تجاهل
          }
        }
      }

      if (!gotFirstChunk) {
        setLastAssistant('لم يصل رد من الخدمة. حاول مجددًا.');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setLastAssistant('⚠️ عذرًا، حدث خطأ:\n' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 900, margin: '20px auto', background: '#fff', borderRadius: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
      height: '75vh', direction: 'rtl',
    }}>
      <div style={{
        padding: 18, background: '#2A5C82', color: '#fff',
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: '1.4em' }}>🩺</span>
        <div>
          <div style={{ fontWeight: 'bold' }}>Coach AI</div>
          <div style={{ fontSize: '0.78em', opacity: 0.85 }}>
            {profile?.full_name ? `مخصص لـ ${profile.full_name}` : 'مساعدك للامتحان الوطني'}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, padding: 20, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 15, background: '#F8FAFC',
      }}>
        {messages.map((msg, i) => {
          const isEmpty = msg.role === 'assistant' && msg.content === '' && loading;
          return (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
              background: msg.role === 'user' ? '#EFF6FF' : '#fff',
              color: '#1E293B', padding: '12px 18px', borderRadius: 12,
              maxWidth: '78%', boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0', textAlign: 'right',
            }}>
              <p style={{
                margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95em',
              }}>
                {isEmpty ? '● ● ●' : msg.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: 15, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب سؤالك الطبي..."
          disabled={loading}
          style={{
            flex: 1, padding: 12, borderRadius: 8,
            border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.95em',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#94A3B8' : '#2A5C82',
            color: '#fff', border: 'none', padding: '0 24px',
            borderRadius: 8, fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}