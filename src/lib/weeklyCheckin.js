import { supabase } from './supabase';

// الحصول على تاريخ بداية الأسبوع الحالي (السبت)
export function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = الأحد، 6 = السبت
  const diff = day === 6 ? 0 : day + 1; // نحوّل للسبت كبداية
  const saturday = new Date(now);
  saturday.setDate(now.getDate() - diff);
  return saturday.toISOString().split('T')[0];
}

// هل يوجد تقرير لهذا الأسبوع؟
export async function hasCurrentWeekReport(userId) {
  const weekStart = getCurrentWeekStart();
  const { data, error } = await supabase
    .from('weekly_performance')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

// حفظ/تحديث تقرير
export async function saveWeeklyReport(userId, reportData) {
  const weekStart = getCurrentWeekStart();
  const { data, error } = await supabase
    .from('weekly_performance')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      ...reportData,
    }, { onConflict: 'user_id,week_start' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// جلب كل التقارير
export async function listWeeklyReports(userId, limit = 12) {
  const { data, error } = await supabase
    .from('weekly_performance')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// جلب تقرير أسبوع محدد
export async function getWeeklyReport(userId, weekStart) {
  const { data, error } = await supabase
    .from('weekly_performance')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// حذف تقرير
export async function deleteWeeklyReport(id) {
  const { error } = await supabase
    .from('weekly_performance')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// حساب المعدلات
export function computeAccuracy(report) {
  if (!report || !report.questions_attempted) return 0;
  return Math.round((report.questions_correct / report.questions_attempted) * 100);
}

export function formatWeek(weekStart) {
  const d = new Date(weekStart);
  return d.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}