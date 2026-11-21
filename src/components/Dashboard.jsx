import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getDashboardStats } from '../lib/dashboardStats';
import StreakCard from './StreakCard';
import ExamCountdown from './ExamCountdown';
import Mascot from './Mascot';
import { MessageSquare, AlertCircle, FolderOpen, BookOpen, Star, AlertTriangle, Library, TrendingUp } from 'lucide-react';

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

  const subjectCounts = {};
  (stats?.wrongAnswers || []).forEach(w => {
    const s = w.subject || 'غير محدد';
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  });

  const topSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = Math.max(...topSubjects.map(([, c]) => c), 1);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10" dir="rtl">
      
      {/* Header with Mascot */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-5 z-10">
          <div className="bg-brand/10 p-2 rounded-full border border-brand/20">
            <Mascot state="neutral" size={80} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content mb-1">لوحة التحكم</h1>
            <p className="text-sm text-content-muted">مرحباً بك يا بطل، جاهز لدراسة اليوم؟</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 z-10">
          {profile?.faculty_slug === 'medicine' && profile?.year === '6' && <ExamCountdown />}
          <StreakCard userId={session?.user?.id} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FolderOpen size={20} />} value={stats?.documentsCount || 0} label="ملف مرفوع" color="text-brand" bgColor="bg-brand/10" />
        <StatCard icon={<MessageSquare size={20} />} value={stats?.conversationsCount || 0} label="محادثة" color="text-medical-teal" bgColor="bg-medical-teal/10" />
        <StatCard icon={<AlertCircle size={20} />} value={stats?.wrongAnswersCount || 0} label="للمراجعة" color="text-red-500" bgColor="bg-red-500/10" />
        <StatCard icon={<BookOpen size={20} />} value={stats?.messagesCount || 0} label="رسالة" color="text-brand-light" bgColor="bg-brand-light/10" />
      </div>

      {/* Academic Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-5 text-center hover:border-brand/30 transition-colors">
          <Star className="mx-auto text-yellow-500 mb-2" size={24} />
          <div className="text-2xl font-bold text-content mb-1">{Object.values(profile?.subject_levels || {}).filter(l => l === 'ممتاز').length}</div>
          <div className="text-xs text-content-muted">مواد ممتازة</div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5 text-center hover:border-brand/30 transition-colors">
          <AlertTriangle className="mx-auto text-red-500 mb-2" size={24} />
          <div className="text-2xl font-bold text-content mb-1">{Object.values(profile?.subject_levels || {}).filter(l => l === 'ضعيف').length}</div>
          <div className="text-xs text-content-muted">مواد ضعيفة</div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5 text-center hover:border-brand/30 transition-colors">
          <Library className="mx-auto text-brand mb-2" size={24} />
          <div className="text-2xl font-bold text-content mb-1">{profile?.target_subjects?.length || 0}</div>
          <div className="text-xs text-content-muted">مواد مسجلة</div>
        </div>
      </div>

      {/* Weak Subjects */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-content mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand" /> أكثر المواد التي تحتاج مراجعة
        </h3>
        {topSubjects.length === 0 ? (
          <div className="text-center py-6 text-content-subtle text-sm">لا توجد أخطاء محفوظة بعد. استمر!</div>
        ) : (
          <div className="space-y-4">
            {topSubjects.map(([subject, count]) => (
              <div key={subject}>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-content font-medium">{subject}</span>
                  <span className="text-red-500 font-bold">{count} خطأ</span>
                </div>
                <div className="h-2 bg-surface-soft rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-red-500 to-orange-400 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, bgColor }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl p-4 flex flex-col items-center justify-center hover:shadow-md transition-all">
      <div className={`mb-2 p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
      <div className={`text-2xl font-bold ${color} mb-1 tabular-nums`}>{value}</div>
      <div className="text-xs text-content-muted">{label}</div>
    </div>
  );
}