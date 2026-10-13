import { supabase } from './supabase';

// إنشاء محادثة جديدة
export async function createConversation(userId, title = 'محادثة جديدة') {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// جلب كل محادثات المستخدم
export async function listConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// جلب رسائل محادثة معينة
export async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// حفظ رسالة
export async function saveMessage(conversationId, role, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();
  if (error) throw error;

  // تحديث updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

// تحديث عنوان المحادثة
export async function updateConversationTitle(conversationId, title) {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);
  if (error) throw error;
}

// حذف محادثة (والرسائل تُحذف تلقائيًا بـ cascade)
export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  if (error) throw error;
}
// ═══════════════════════════════════════
// دوال إضافية لصفحة "محادثاتي"
// ═══════════════════════════════════════

// جلب المحادثات مع عدد الرسائل
export async function listConversationsWithCounts(userId) {
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (convErr) throw convErr;
  if (!convs || convs.length === 0) return [];

  // جلب عدد الرسائل لكل محادثة
  const convIds = convs.map(c => c.id);
  const { data: msgs, error: msgErr } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convIds);

  if (msgErr) throw msgErr;

  const counts = {};
  (msgs || []).forEach(m => {
    counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
  });

  return convs.map(c => ({
    ...c,
    message_count: counts[c.id] || 0,
  }));
}

// حذف عدة محادثات دفعة واحدة
export async function deleteConversations(ids) {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase
    .from('conversations')
    .delete()
    .in('id', ids);
  if (error) throw error;
}

// تحديث عنوان محادثة
export async function renameConversation(conversationId, newTitle) {
  const { error } = await supabase
    .from('conversations')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (error) throw error;
}