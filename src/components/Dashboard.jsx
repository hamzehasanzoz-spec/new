import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getDashboardStats } from '../lib/dashboardStats';
import StreakCard from './StreakCard';
import ExamCountdown from './ExamCountdown';

export default function Dashboard({ profile, session }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadStats();
  }, [session?.user?.id]);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats(session.user.id);
      setStats(data);
    } catch (err) {
      console.error('فشل تحميل الإحصائيات:', err);
    } finally {
      setLoading(false);
    }
  };

  // ═══ حساب البيانات ═══
  const subjectCounts = {};
  (stats?.wrongAnswers || []).forEach(w => {
    const s = w.subject || 'غير محدد';
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  });

  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCount = Math.max(...topSubjects.map(([, c]) => c), 1);

  const getRecommendation = () => {
    if (!stats) return null;
    const total = stats.wrongAnswersCount;
    if (total === 0 && stats.documentsCount === 0)
      return { icon: '📚', color: 'primary', text: 'ابدأ برفع ملفاتك الدراسية ثم جرّب اختبارًا.' };
    if (total === 0 && stats.documentsCount > 0)
      return { icon: '🎯', color: 'success', text: 'ملفاتك جاهزة! جرّب اختبارًا لتقييم مستواك.' };
    if (topSubjects.length > 0 && topSubjects[0][1] >= 3)
      return { icon: '⚠️', color: 'warn', text: `ركّز على "${topSubjects[0][0]}" — لديك ${topSubjects[0][1]} أسئلة خاطئة.` };
    if (total > 0)
      return { icon: '💪', color: 'success', text: `أداء جيد! لديك ${total} سؤال للمراجعة.` };
    return null;
  };

  const recommendation = getRecommendation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-content-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">

      {/* ═══ Header ═══ */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-content mb-1">
              أهلاً، د. {profile?.full_name || 'زميلنا'} 👋
            </h1>
            <p className="text-sm text-content-muted">
              {profile?.current_stage || 'مرحلتك'} — {profile?.university || 'جامعتك'}
            </p>
            {profile?.score_goal && (
              <p className="text-xs text-content-subtle mt-1">
                🎯 الهدف: {profile.score_goal}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* تم تعديل هذا الجزء لإخفاء العدّاد حسب الكلية والسنة */}
            {((profile?.faculty_slug === 'medicine' && profile?.year === '6') || 
              ((profile?.faculty_slug === 'dentistry' || profile?.faculty_slug === 'pharmacy') && profile?.year === '5')) && (
              <ExamCountdown />
            )}
            <StreakCard userId={session?.user?.id} />
          </div>
        </div>
      </div>

      {/* ═══ 4 بطاقات إحصائية ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon="📚"
          value={stats?.documentsCount || 0}
          label="ملف مرفوع"
          color="text-primary"
        />
        <StatCard
          icon="💬"
          value={stats?.conversationsCount || 0}
          label="محادثة"
          color="text-success"
        />
        <StatCard
          icon="❌"
          value={stats?.wrongAnswersCount || 0}
          label="للمراجعة"
          color="text-danger"
        />
        <StatCard
          icon="💭"
          value={stats?.messagesCount || 0}
          label="رسالة"
          color="text-warn"
        />
      </div>

      {/* ═══ التوصية ═══ */}
      {recommendation && (
        <div className="bg-surface-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center text-2xl
            ${recommendation.color === 'primary' ? 'bg-primary/10' : ''}
            ${recommendation.color === 'success' ? 'bg-success/10' : ''}
            ${recommendation.color === 'warn' ? 'bg-warn/10' : ''}
          `}>
            {recommendation.icon}
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-content-subtle uppercase tracking-wide mb-1">
              توصية اليوم
            </div>
            <div className="text-sm text-content">
              {recommendation.text}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Grid: ضعيف + محادثات ═══ */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* المواد الضعيفة */}
        <div className="bg-surface-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-content mb-4 flex items-center gap-2">
            📉 أكثر المواد التي تحتاج مراجعة
          </h3>

          {topSubjects.length === 0 ? (
            <div className="text-center py-8 text-content-subtle text-sm">
              لا توجد أخطاء محفوظة بعد.
            </div>
          ) : (
            <div className="space-y-3">
              {topSubjects.map(([subject, count]) => {
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={subject}>
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="text-content font-medium">{subject}</span>
                      <span className="text-danger font-bold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-danger to-warn rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* آخر المحادثات */}
        <div className="bg-surface-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-content mb-4 flex items-center gap-2">
            💬 آخر المحادثات
          </h3>

          {!stats?.recentConversations?.length ? (
            <div className="text-center py-8 text-content-subtle text-sm">
              لا توجد محادثات بعد.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentConversations.map(conv => (
                <div
                  key={conv.id}
                  className="bg-surface-soft border-r-2 border-primary rounded-md p-3 hover:bg-surface transition-colors cursor-pointer"
                >
                  <div className="text-sm text-content font-medium truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-content-subtle mt-1">
                    {new Date(conv.updated_at).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ المواد المستهدفة ═══ */}
      {profile?.target_subjects?.length > 0 && (
        <div className="bg-surface-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-content mb-3 flex items-center gap-2">
            📖 موادك المستهدفة
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.target_subjects.map(s => {
              const level = profile.subject_levels?.[s];
              const colorClass = level === 'ضعيف' ? 'text-danger bg-danger/10 border-danger/30'
                : level === 'متوسط' ? 'text-warn bg-warn/10 border-warn/30'
                : level === 'جيد' ? 'text-primary bg-primary/10 border-primary/30'
                : level === 'ممتاز' ? 'text-success bg-success/10 border-success/30'
                : 'text-content-muted bg-surface-soft border-border';
              return (
                <span
                  key={s}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${colorClass}`}
                >
                  {s} {level && `• ${level}`}
                </span>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════
// StatCard
// ═══════════════════════════════════════
function StatCard({ icon, value, label, color }) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${color} mb-1 tabular-nums`}>
        {value}
      </div>
      <div className="text-xs text-content-subtle">
        {label}
      </div>
    </div>
  );
}