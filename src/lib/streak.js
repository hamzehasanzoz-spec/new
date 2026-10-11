import { supabase } from './supabase';

// تسجيل نشاط لليوم الحالي
export async function logActivity(userId, activityType) {
  if (!userId || !activityType) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // نحاول تحديث الصف الحالي
    const { data: existing } = await supabase
      .from('user_activity')
      .select('id, activities')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .maybeSingle();

    if (existing) {
      // أضف النشاط إذا لم يكن موجودًا
      const current = existing.activities || [];
      if (!current.includes(activityType)) {
        await supabase
          .from('user_activity')
          .update({ activities: [...current, activityType] })
          .eq('id', existing.id);
      }
    } else {
      // أنشئ صف جديد
      await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_date: today,
          activities: [activityType],
        });
    }
  } catch (err) {
    console.error('logActivity error:', err);
  }
}

// حساب الـ streak الحالي
export async function getStreak(userId) {
  if (!userId) return { current: 0, longest: 0, todayDone: false, days: [] };

  const { data, error } = await supabase
    .from('user_activity')
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(365);

  if (error || !data) {
    return { current: 0, longest: 0, todayDone: false, days: [] };
  }

  const dates = data.map(r => r.activity_date);
  const dateSet = new Set(dates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // حساب الـ current streak
  let current = 0;
  const todayDone = dateSet.has(todayStr);

  if (todayDone || dateSet.has(yesterdayStr)) {
    // ابدأ من اليوم أو أمس
    let checkDate = new Date(todayDone ? today : yesterday);
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dateSet.has(checkStr)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // حساب الـ longest streak
  const sorted = [...dates].sort();
  let longest = 0;
  let temp = 0;
  let prev = null;

  for (const d of sorted) {
    const curr = new Date(d);
    curr.setHours(0, 0, 0, 0);
    if (prev === null) {
      temp = 1;
    } else {
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        temp++;
      } else if (diff > 1) {
        temp = 1;
      }
    }
    longest = Math.max(longest, temp);
    prev = curr;
  }

  // بناء الأيام الـ 30 الأخيرة
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    days.push({
      date: dStr,
      day: d.getDate(),
      active: dateSet.has(dStr),
      isToday: dStr === todayStr,
    });
  }

  return {
    current,
    longest,
    todayDone,
    days,
  };
}