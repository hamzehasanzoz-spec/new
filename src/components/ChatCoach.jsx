import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/streak';
import { createConversation, listConversations, loadMessages, saveMessage } from '../lib/chatStorage';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Send, Bot, User, Menu, Plus, Square } from 'lucide-react';
import Mascot from './Mascot';
export default function ChatCoach({ profile, session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [ragStatus, setRagStatus] = useState('');

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const userId = session?.user?.id;

  useEffect(() => { setShowSidebar(!isMobile); }, [isMobile]);
  useEffect(() => { if (userId) refreshConversations(); }, [userId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      setMessages([{ role: 'assistant', content: 'مرحباً بك. أنا مساعدك الطبي الذكي. كيف يمكنني مساعدتك اليوم؟' }]);
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }, [input]);

  const refreshConversations = async () => {
    try { const list = await listConversations(userId); setConversations(list); } catch (err) {}
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([{ role: 'assistant', content: 'محادثة جديدة. كيف يمكنني مساعدتك؟' }]);
    setRagStatus('');
  };

  const handleSelectConversation = async (id) => {
    if (id === conversationId) return;
    try {
      setLoading(true);
      const msgs = await loadMessages(id);
      setConversationId(id);
      setMessages(msgs.length > 0 ? msgs.map(m => ({ role: m.role, content: m.content })) : []);
      if (isMobile) setShowSidebar(false);
    } catch (err) {} finally { setLoading(false); }
  };

  const updateLastAssistant = (content) => {
    setMessages(prev => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      if (copy[lastIdx].role === 'assistant') copy[lastIdx] = { ...copy[lastIdx], content };
      return copy;
    });
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
      } catch (err) { alert('فشل إنشاء محادثة'); return; }
    }

    const userMsg = { role: 'user', content: userMessage };
    const withUser = [...messages, userMsg];
    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setLoading(true);
    setRagStatus('جاري البحث...');

    try {
      await saveMessage(currentConvId, 'user', userMessage);
      await logActivity(userId, 'chat');
    } catch (err) {}

    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) throw new Error('انتهت الجلسة');

      const res = await fetch('/api/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage, accessToken: freshSession.access_token }),
      });

      if (!res.ok) throw new Error('فشل الاتصال');
      const data = await res.json();
      
      if (data.success) {
        updateLastAssistant(data.finalAnswer);
        await saveMessage(currentConvId, 'assistant', data.finalAnswer);
      } else {
        throw new Error(data.error || 'حدث خطأ');
      }
    } catch (err) {
      updateLastAssistant('عذراً، حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
      setRagStatus('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-[85vh] w-full max-w-7xl mx-auto overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      
      {showSidebar && (
        <div className={`${isMobile ? 'fixed inset-0 z-50 bg-black/50' : 'w-72 border-l border-border bg-surface-soft'} flex flex-col`}>
          {isMobile && <div className="absolute inset-0" onClick={() => setShowSidebar(false)} />}
          <div className={`${isMobile ? 'absolute right-0 w-72 h-full bg-surface flex flex-col' : 'flex-1 flex flex-col'}`}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-sm text-content">محادثاتي</h2>
              <button onClick={handleNewChat} className="p-2 hover:bg-surface rounded-lg text-primary transition-colors"><Plus size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map(conv => (
                <div key={conv.id} onClick={() => handleSelectConversation(conv.id)} className={`p-3 rounded-lg text-sm cursor-pointer truncate transition-colors ${conversationId === conv.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface text-content-muted'}`}>
                  {conv.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-surface relative">
        <div className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-surface/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 -ml-2 text-content-muted hover:text-content"><Menu size={20} /></button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Bot size={18} /></div>
              <div>
                <div className="font-bold text-sm text-content">Coach AI</div>
                <div className="text-xs text-content-muted">{loading ? 'جاري التفكير...' : 'متصل'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" data-lenis-prevent>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isEmpty = !isUser && msg.content === '' && loading;

            return (
              <div key={i} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 shrink-0 flex items-center justify-center ${isUser ? 'bg-surface-soft text-content rounded-full' : ''}`}>
                  {isUser ? (
                    <User size={18} />
                  ) : (
                    <Mascot state={isEmpty ? 'thinking' : 'happy'} size={40} />
                  )}
                </div>
                <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${isUser ? 'bg-brand text-white rounded-tr-sm' : 'bg-surface-card text-content border border-border rounded-tl-sm'}`}>
                    {isEmpty ? (
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 bg-content-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-content-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-content-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {ragStatus && <div className="flex justify-center text-xs text-primary animate-pulse font-medium">{ragStatus}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-surface border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-surface-soft border border-border rounded-2xl p-2 focus-within:ring-1 focus-within:ring-primary transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="اسأل عن أي شيء طبي..."
              disabled={loading}
              rows={1}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-content resize-none placeholder:text-content-muted focus:outline-none max-h-[150px]"
            />
            <button type="submit" disabled={loading || !input.trim()} className="p-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl disabled:opacity-50 transition-opacity">
              <Send size={18} />
            </button>
          </form>
          <div className="text-center text-[10px] text-content-subtle mt-2">كوتش AI يمكن أن يخطئ. تحقق دائماً من المعلومات الطبية الهامة.</div>
        </div>
      </div>
    </div>
  );
}