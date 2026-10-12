import React, { useState, useRef, useEffect } from 'react';
import { buildSystemPrompt } from '../lib/buildSystemPrompt';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/streak';
import {
  createConversation,
  listConversations,
  loadMessages,
  saveMessage,
  deleteConversation,
} from '../lib/chatStorage';
import ConversationsSidebar from './ConversationsSidebar';
import { useIsMobile } from '../hooks/useMediaQuery';
import { exportConversationPDF } from '../lib/pdfExport';


export default function ChatCoach({ profile, session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [ragStatus, setRagStatus] = useState('');
  const [lastProvider, setLastProvider] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  const userId = session?.user?.id;

  useEffect(() => {
    setShowSidebar(!isMobile);
  }, [isMobile]);

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

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

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
    setRagStatus('');
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
      if (isMobile) setShowSidebar(false);
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
      copy[lastIdx] = { ...copy[lastIdx], content };
      return copy;
    });
  };

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

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
    setLastProvider('');

    try {
      await saveMessage(currentConvId, 'user', userMessage);
      await logActivity(userId, 'chat');
    } catch (err) {
      console.error('فشل حفظ رسالة المستخدم:', err);
    }

    let reader = null;
    try {
      setRagStatus('📚 جاري البحث في ملفاتك...');
      const relevantChunks = await searchUserDocuments(userMessage);

      let systemPrompt = buildSystemPrompt(profile);

      if (relevantChunks.length > 0) {
        setRagStatus(`📚 وجدت ${relevantChunks.length} جزء ذو صلة`);
        systemPrompt += '\n\n## مقاطع من ملفات الطالب المرفوعة (استخدمها كمصدر أساسي):';
        systemPrompt += '\nالمقاطع التالية مأخوذة من ملفات رفعها الطالب. اعتمد عليها أولًا، واذكر اسم الملف المصدر.';

        relevantChunks.forEach((chunk, i) => {
          systemPrompt += `\n\n### مقطع ${i + 1} — من ملف "${chunk.filename}" (تشابه: ${(chunk.similarity * 100).toFixed(0)}%):\n${chunk.content}`;
        });

        systemPrompt += '\n\n**مهم:** إذا كانت المقاطع أعلاه تحتوي على الإجابة، استخدمها كأساس واذكر اسم الملف.';
      } else {
        setRagStatus('');
      }

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

      // ⭐ اقرأ Provider من الـ headers
      const providerHeader = res.headers.get('X-Provider') || '';
      const modelHeader = res.headers.get('X-Model') || '';
      if (providerHeader) {
        setLastProvider(`${providerHeader}${modelHeader ? ` • ${modelHeader.split('/').pop()}` : ''}`);
      }

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: isMobile ? '8px auto' : '20px auto',
      display: 'flex',
      gap: 0,
      direction: 'rtl',
      height: isMobile ? 'calc(100vh - 140px)' : '75vh',
    }}>
      {showSidebar && !isMobile && (
        <ConversationsSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={handleDeleteConversation}
        />
      )}

      {isMobile && showSidebar && (
        <>
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 200,
          }} onClick={() => setShowSidebar(false)} />
          <div style={{
            position: 'fixed', top: 0, right: 0,
            width: '78%', maxWidth: 320, height: '100vh',
            background: 'var(--bg-elevated)', zIndex: 201,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <ConversationsSidebar
              conversations={conversations}
              activeId={conversationId}
              onSelect={(id) => { handleSelectConversation(id); setShowSidebar(false); }}
              onNew={() => { handleNewChat(); setShowSidebar(false); }}
              onDelete={handleDeleteConversation}
            />
          </div>
        </>
      )}

      <div style={{
        flex: 1,
        background: 'var(--bg-elevated)',
        borderRadius: showSidebar && !isMobile ? '16px 0 0 16px' : 16,
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          padding: 14,
          background: 'var(--primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(s => !s)}
                style={{
                  background: 'transparent', border: 'none', color: '#fff',
                  fontSize: '1.3em', cursor: 'pointer', padding: 4,
                }}
              >
                ☰
              </button>
            )}
            <span style={{ fontSize: '1.4em' }}>🩺</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>Coach AI</div>
              <div style={{ fontSize: '0.75em', opacity: 0.85 }}>
                {profile?.full_name ? `مخصص لـ ${profile.full_name}` : 'مساعدك للامتحان الوطني'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {messages.length > 1 && (
              <button
                onClick={async () => {
                  try {
                    await exportConversationPDF(messages, profile);
                  } catch (err) {
                    alert('فشل التصدير: ' + err.message);
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.75em',
                  fontWeight: 'bold',
                  fontFamily: 'inherit',
                }}
                title="تصدير المحادثة PDF"
              >
                📄 PDF
              </button>
            )}
            {lastProvider && (
              <div style={{
                fontSize: '0.7em',
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 600,
              }}>
                ⚡ {lastProvider}
              </div>
            )}
            {ragStatus && (
              <div style={{
                fontSize: '0.72em',
                opacity: 0.9,
                background: 'rgba(255,255,255,0.15)',
                padding: '4px 10px',
                borderRadius: 20,
              }}>
                {ragStatus}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          padding: isMobile ? 12 : 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 15,
          background: 'var(--bg)',
        }}>
          {messages.map((msg, i) => {
            const isEmpty = msg.role === 'assistant' && msg.content === '' && loading;
            const isUser = msg.role === 'user';
            return (
              <div key={i} style={{
                alignSelf: isUser ? 'flex-start' : 'flex-end',
                background: isUser ? '#EFF6FF' : 'var(--bg-elevated)',
                color: isUser ? '#1E40AF' : 'var(--text)',
                padding: '12px 18px',
                borderRadius: 12,
                maxWidth: '85%',
                boxShadow: 'var(--shadow-sm)',
                border: `1px solid ${isUser ? '#BFDBFE' : 'var(--border)'}`,
                textAlign: 'right',
              }}>
                <p style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  fontSize: '0.95em',
                }}>
                  {isEmpty ? '● ● ●' : msg.content}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={{
          padding: 12,
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك الطبي... (Enter للإرسال، Shift+Enter لسطر جديد)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--border)',
              outline: 'none',
              fontSize: '0.95em',
              fontFamily: 'inherit',
              background: 'var(--bg-subtle)',
              color: 'var(--text)',
              resize: 'none',
              maxHeight: 200,
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'var(--text-subtle)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 10,
              fontWeight: 'bold',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.9em',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '...' : 'إرسال'}
          </button>
        </form>
      </div>
    </div>
  );
}