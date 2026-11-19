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
  
  // حالات الدكاترة الجديدة
  const [professors, setProfessors] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);

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

  // جلب الدكاترة المتاحين لكلية الطالب
  useEffect(() => {
    const fetchProfessors = async () => {
      if (!profile?.faculty_slug) return;
      const { data } = await supabase
        .from('professors')
        .select('*, professor_styles(*)')
        .eq('faculty_slug', profile.faculty_slug);
      
      if (data) {
        // نعرض فقط الدكاترة الذين تمت إضافة أسلوب لهم
        const validProfs = data.filter(p => p.professor_styles && p.professor_styles.length > 0);
        setProfessors(validProfs);
      }
    };
    fetchProfessors();
  }, [profile?.faculty_slug]);

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

      // استخدام البحث المتقدم والمنسق الجديد (Hybrid Search + GraphRAG + Reranking)
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
    setRagStatus('🧠 جاري التفكير عبر LangGraph...');
    setLastProvider('LangGraph');

    try {
      await saveMessage(currentConvId, 'user', userMessage);
      await logActivity(userId, 'chat');
    } catch (err) {
      console.error('فشل حفظ رسالة المستخدم:', err);
    }

    try {
      // 1. جلب الـ Token
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) throw new Error('انتهت الجلسة');

      // 2. استدعاء LangGraph API
      const res = await fetch('/api/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMessage, 
          accessToken: freshSession.access_token
        }),
      });

      // التحقق من نوع المحتوى لتجنب انهيار JSON
      const contentType = res.headers.get('content-type');
      
      if (!res.ok) {
        const errorText = await res.text(); // نقرأه كنص
        throw new Error(`Server Error (${res.status}): ${errorText.slice(0, 100)}`);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const rawText = await res.text();
        throw new Error(`الخادم لم يرجع JSON. الرد كان: ${rawText.slice(0, 100)}...`);
      }

      const data = await res.json();
      
      // 3. عرض الإجابة
      if (data.success) {
        updateLastAssistant(data.finalAnswer);
        await saveMessage(currentConvId, 'assistant', data.finalAnswer);
      } else {
        throw new Error(data.error || 'حدث خطأ غير معروف');
      }

    } catch (err) {
      console.error('Chat error:', err);
      updateLastAssistant('⚠️ حدث خطأ:\n' + err.message);
    } finally {
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
        <div className="bg-surface-soft border-b border-border p-4 flex items-center justify-between gap-3 flex-wrap">
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

          <div className="flex items-center gap-2 flex-wrap">
            
            {/* ⭐ قائمة اختيار الدكتور المضافة ⭐ */}
            {professors.length > 0 && (
              <select
                value={selectedProf?.id || ''}
                onChange={(e) => {
                  const prof = professors.find(p => p.id === e.target.value);
                  setSelectedProf(prof || null);
                }}
                className="text-xs bg-surface-card border border-border rounded-md px-2 py-1.5 text-content focus:outline-none focus:border-primary max-w-[180px] truncate"
              >
                <option value="">🤖 AI افتراضي</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>د. {p.name} - {p.subject}</option>
                ))}
              </select>
            )}

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
              <div className="hidden md:flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                <span>⚡</span>
                <span className="font-medium">{lastProvider}</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
          {ragStatus && (
            <div className="text-center text-xs text-primary animate-pulse mb-2">
              {ragStatus}
            </div>
          )}
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