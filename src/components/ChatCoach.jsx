import React, { useState, useRef, useEffect } from 'react';
import { buildSystemPrompt } from '../lib/buildSystemPrompt';
import { supabase } from '../lib/supabase';
import {
  createConversation,
  listConversations,
  loadMessages,
  saveMessage,
  deleteConversation,
} from '../lib/chatStorage';
import ConversationsSidebar from './ConversationsSidebar';

export default function ChatCoach({ profile, session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [ragStatus, setRagStatus] = useState(''); // يعرض حالة البحث
  const bottomRef = useRef(null);

  const userId = session?.user?.id;

  const welcomeMessage = {
  role: 'assistant',
  content: `جاهز. اسألني أي سؤال طبي.`,
};

  useEffect(() => {
    if (!userId) return;
    refreshConversations();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      setMessages([welcomeMessage]);
    }
  }, []);

  const refreshConversations = async () => {
    try {
      const list = await listConversations(userId);
      setConversations(list);
    } catch (err) {
      console.error('فشل جلب المحادثات:', err);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([welcomeMessage]);
  };

  const handleSelectConversation = async (id) => {
    if (id === conversationId) return;
    try {
      setLoading(true);
      const msgs = await loadMessages(id);
      setConversationId(id);
      setMessages(
        msgs.length > 0
          ? msgs.map(m => ({ role: m.role, content: m.content }))
          : [welcomeMessage]
      );
    } catch (err) {
      console.error('فشل تحميل المحادثة:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      if (id === conversationId) {
        setConversationId(null);
        setMessages([welcomeMessage]);
      }
      refreshConversations();
    } catch (err) {
      console.error('فشل الحذف:', err);
    }
  };

  const updateLastAssistant = (content) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      if (copy[lastIdx].role !== 'assistant') return prev;
      copy[lastIdx] = { role: 'assistant', content };
      return copy;
    });
  };

  // ⭐ دالة جديدة: البحث في ملفات الطالب
  const searchUserDocuments = async (query) => {
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) return [];

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession.access_token}`,
        },
                body: JSON.stringify({ query, matchCount: 5, threshold: 0.1 }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data.matches || [];
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const title = userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '');
        const newConv = await createConversation(userId, title);
        currentConvId = newConv.id;
        setConversationId(currentConvId);
        refreshConversations();
      } catch (err) {
        console.error('فشل إنشاء المحادثة:', err);
        alert('فشل إنشاء محادثة جديدة');
        return;
      }
    }

    const userMsg = { role: 'user', content: userMessage };
    const withUser = [...messages, userMsg];
    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setLoading(true);
    setRagStatus('');

    try {
      await saveMessage(currentConvId, 'user', userMessage);
    } catch (err) {
      console.error('فشل حفظ رسالة المستخدم:', err);
    }

    let reader = null;
    try {
      // ⭐ 1. البحث في ملفات الطالب
      setRagStatus('📚 جاري البحث في ملفاتك...');
            const relevantChunks = await searchUserDocuments(userMessage);
      console.log('🔍 Search results:', relevantChunks.length, relevantChunks);

      // ⭐ 2. بناء System Prompt مع النتائج
      let systemPrompt = buildSystemPrompt(profile);

      if (relevantChunks.length > 0) {
        setRagStatus(`📚 وجدت ${relevantChunks.length} جزء ذو صلة في ملفاتك`);
        systemPrompt += '\n\n## مقاطع من ملفات الطالب المرفوعة (استخدمها كمصدر أساسي):';
        systemPrompt += '\nالمقاطع التالية مأخوذة من ملفات رفعها الطالب. **اعتمد عليها أولًا** في إجابتك، واذكر اسم الملف المصدر.';
        
        relevantChunks.forEach((chunk, i) => {
          systemPrompt += `\n\n### مقطع ${i + 1} — من ملف "${chunk.filename}" (تشابه: ${(chunk.similarity * 100).toFixed(0)}%):\n${chunk.content}`;
        });
        
        systemPrompt += '\n\n**مهم:** إذا كانت المقاطع أعلاه تحتوي على الإجابة، استخدمها كأساس واذكر اسم الملف. إذا لم تكن كافية، أكمل من معرفتك العامة مع التنويه.';
      } else {
        setRagStatus('');
      }

      // 3. إرسال للـ chat
      const recent = withUser.slice(-10);
      const payload = [
        { role: 'system', content: systemPrompt },
        ...recent.map(m => ({ role: m.role, content: m.content })),
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errMsg = errJson.error;
        } catch {}
        throw new Error(errMsg);
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let gotContent = false;

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
          if (data === '[DONE]' || data.startsWith(':')) continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              gotContent = true;
              assistantText += delta.content;
              updateLastAssistant(assistantText);
            }
          } catch {}
        }
      }

      if (!gotContent) {
        updateLastAssistant('⚠️ لم يصل رد من النموذج.');
      } else {
        try {
          await saveMessage(currentConvId, 'assistant', assistantText);
        } catch (err) {
          console.error('فشل حفظ رد المساعد:', err);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      let msg;
      if (err.name === 'AbortError') {
        msg = '⏱️ استغرق الرد وقتًا طويلًا.';
      } else {
        msg = '⚠️ حدث خطأ:\n' + err.message;
      }
      updateLastAssistant(msg);
    } finally {
      try { reader?.releaseLock(); } catch {}
      setLoading(false);
      setRagStatus('');
    }
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: '20px auto',
      display: 'flex',
      gap: 0,
      direction: 'rtl',
    }}>
      {showSidebar && (
        <ConversationsSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={handleDeleteConversation}
        />
      )}

      <div style={{
        flex: 1,
        background: '#fff',
        borderRadius: showSidebar ? '16px 0 0 16px' : 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 16,
          background: '#2A5C82',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowSidebar(s => !s)}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                fontSize: '1.3em', cursor: 'pointer', padding: 4,
              }}
              title="إظهار/إخفاء القائمة"
            >
              ☰
            </button>
            <span style={{ fontSize: '1.4em' }}>🩺</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>Coach AI</div>
              <div style={{ fontSize: '0.78em', opacity: 0.85 }}>
                {profile?.full_name ? `مخصص لـ ${profile.full_name}` : 'مساعدك للامتحان الوطني'}
              </div>
            </div>
          </div>
          {ragStatus && (
            <div style={{ fontSize: '0.82em', opacity: 0.9 }}>
              {ragStatus}
            </div>
          )}
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
            {loading ? '...' : 'إرسال'}
          </button>
        </form>
      </div>
    </div>
  );
}