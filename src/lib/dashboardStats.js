import { supabase } from './supabase';

export async function getDashboardStats(userId) {
  // 1. عدد الملفات
  const docsPromise = supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // 2. عدد المحادثات + آخر 3
  const convsPromise = supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  // 3. الأخطاء (للتوزيع حسب المادة)
  const wrongsPromise = supabase
    .from('wrong_answers')
    .select('id, subject, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const [docsRes, convsRes, wrongsRes] = await Promise.all([
    docsPromise,
    convsPromise,
    wrongsPromise,
  ]);

  const documentsCount = docsRes.count || 0;
  const conversations = convsRes.data || [];
  const wrongAnswers = wrongsRes.data || [];

  // 4. عدد الرسائل (عبر conversations)
  let messagesCount = 0;
  if (conversations.length > 0) {
    const convIds = conversations.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds);
    messagesCount = count || 0;
  }

  return {
    documentsCount,
    conversationsCount: conversations.length,
    messagesCount,
    wrongAnswersCount: wrongAnswers.length,
    recentConversations: conversations.slice(0, 3),
    wrongAnswers,
  };
}