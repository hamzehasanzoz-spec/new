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

  // استقبل حدث فتح محادثة
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (id) handleSelectConversation(id);
    };
    window.addEventListener('open-conversation', handler);
    return () => window.removeEventListener('open-conversation', handler);
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
    <div
      className="flex h-[calc(100vh-140px)] md:h-[75vh] max-w-6xl mx-auto"
      dir="rtl"
    >
      {/* Sidebar */}
      {showSidebar && !isMobile && (
        <ConversationsSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={handleDeleteConversation}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed top-0 right-0 w-[78%] max-w-xs h-screen bg-surface-card z-50">
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

      {/* Main Chat */}
      <div className={`
        flex-1 flex flex-col bg-surface-card border border-border overflow-hidden
        ${showSidebar && !isMobile ? 'rounded-r-none rounded-l-lg' : 'rounded-lg'}
      `}>
        {/* Header */}
        <div className="bg-surface-soft border-b border-border p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(s => !s)}
              className="w-8 h-8 rounded-md bg-surface-card hover:bg-surface border border-border text-content-muted flex items-center justify-center text-sm font-bold transition-colors"
              title={showSidebar ? 'إخفاء القائمة' : 'إظهار القائمة'}
            >
              {showSidebar ? '✕' : '☰'}
            </button>

            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center text-lg">
              🩺
            </div>

            <div className="hidden sm:block">
              <div className="font-semibold text-content text-sm">Coach AI</div>
              <div className="text-xs text-content-muted">
                {profile?.full_name ? `مخصص لـ ${profile.full_name}` : 'مساعدك للامتحان الوطني'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                onClick={async () => {
                  try {
                    await exportConversationPDF(messages, profile);
                  } catch (err) {
                    alert('فشل التصدير: ' + err.message);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-surface-card border border-border text-content-muted hover:text-content transition-colors"
                title="تصدير PDF"
              >
                📄 PDF
              </button>
            )}

            {lastProvider && (
              <div className="hidden sm:flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                <span>⚡</span>
                <span className="font-medium">{lastProvider}</span>
              </div>
            )}

            {ragStatus && (
              <div className="hidden md:block text-xs text-content-muted">
                {ragStatus}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
          {messages.map((msg, i) => {
            const isEmpty = msg.role === 'assistant' && msg.content === '' && loading;
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`
                  max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed
                  ${isUser
                    ? 'bg-primary text-white'
                    : 'bg-surface-card border border-border text-content'
                  }
                `}>
                  <p className="whitespace-pre-wrap m-0">
                    {isEmpty ? '● ● ●' : msg.content}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border bg-surface-card flex gap-2 items-end"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك الطبي... (Enter للإرسال، Shift+Enter لسطر جديد)"
            disabled={loading}
            rows={1}
            className="
              flex-1 bg-surface-soft border border-border rounded-md
              px-3 py-2.5 text-sm text-content resize-none
              placeholder:text-content-subtle
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
              max-h-[200px] leading-relaxed transition-all
            "
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="
              bg-primary hover:bg-primary-light text-white
              px-5 py-2.5 rounded-md font-semibold text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all flex items-center gap-2
            "
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">...</span>
              </>
            ) : (
              <>
                <span>إرسال</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}