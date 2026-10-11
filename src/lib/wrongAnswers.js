import { supabase } from './supabase';

export async function saveWrongAnswer({
  userId, subject, topic, question, options, correctIndex, userAnswerIndex, explanation,
}) {
  const { data, error } = await supabase
    .from('wrong_answers')
    .insert({
      user_id: userId,
      subject: subject || null,
      topic: topic || null,
      question,
      options,
      correct_index: correctIndex,
      user_answer_index: userAnswerIndex,
      explanation: explanation || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveManyWrongAnswers(userId, wrongAnswers, subject, topic) {
  if (!wrongAnswers || wrongAnswers.length === 0) return [];
  const rows = wrongAnswers.map(w => ({
    user_id: userId,
    subject: subject || null,
    topic: topic || null,
    question: w.question,
    options: w.options,
    correct_index: w.correctIndex,
    user_answer_index: w.userAnswerIndex,
    explanation: w.explanation || null,
  }));
  const { data, error } = await supabase
    .from('wrong_answers')
    .insert(rows)
    .select();
  if (error) throw error;
  return data || [];
}

export async function listWrongAnswers(userId, { subject, limit = 100 } = {}) {
  let query = supabase
    .from('wrong_answers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (subject) query = query.eq('subject', subject);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getWrongAnswersStats(userId) {
  const { data, error } = await supabase
    .from('wrong_answers')
    .select('subject')
    .eq('user_id', userId);
  if (error) throw error;

  const stats = {};
  (data || []).forEach(row => {
    const s = row.subject || 'غير محدد';
    stats[s] = (stats[s] || 0) + 1;
  });
  return stats;
}

export async function deleteWrongAnswer(id) {
  const { error } = await supabase
    .from('wrong_answers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function clearAllWrongAnswers(userId) {
  const { error } = await supabase
    .from('wrong_answers')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}