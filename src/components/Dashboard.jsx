import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getDashboardStats } from '../lib/dashboardStats';
import ExamCountdown from './ExamCountdown';
import StreakCard from './StreakCard';


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

  // توزيع الأخطاء حسب المادة
  const subjectCounts = {};
  (stats?.wrongAnswers || []).forEach(w => {
    const s = w.subject || 'غير محدد';
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  });

  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCount = Math.max(...topSubjects.map(([, c]) => c), 1);

  // التوصية الذكية
  const getRecommendation = () => {
    if (!stats) return null;
    const total = stats.wrongAnswersCount;

    if (total === 0 && stats.documentsCount === 0) {
      return {
        icon: '📚',
        color: '#2A5C82',
        text: 'ابدأ برفع ملفاتك الدراسية ثم جرّب اختبارًا لتتبع تقدمك.',
      };
    }
    if (total === 0 && stats.documentsCount > 0) {
      return {
        icon: '🎯',
        color: '#10B981',
        text: 'ملفاتك جاهزة! جرّب اختبارًا لتقييم مستواك.',
      };
    }
    if (topSubjects.length > 0 && topSubjects[0][1] >= 3) {
      return {
        icon: '⚠️',
        color: '#F59E0B',
        text: `ركّز على "${topSubjects[0][0]}" — لديك ${topSubjects[0][1]} أسئلة خاطئة فيها.`,
      };
    }
    if (total > 0) {
      return {
        icon: '💪',
        color: '#10B981',
        text: `أداء جيد! لديك ${total} سؤال للمراجعة. ابدأ بـ "بنك الأخطاء".`,
      };
    }
    return null;
  };

  const recommendation = getRecommendation();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100, color: '#64748B' }}>
        جاري تحميل الإحصائيات...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1100,
      margin: '30px auto',
      padding: 25,
      direction: 'rtl',
      textAlign: 'right',
    }}>

      {/* ═══ Header ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff',
        padding: 30,
        borderRadius: 16,
        marginBottom: 24,
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.6em' }}>
          أهلاً، د. {profile?.full_name || 'زميلنا'} 👋
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
          {profile?.current_stage || 'مرحلتك'} — {profile?.university || 'جامعتك'}
        </p>
        {profile?.score_goal && (
          <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85em' }}>
            🎯 الهدف: {profile.score_goal}
          </p>
        )}
      </div>
            {/* 🔥 Streak Card */}
      <div style={{ marginBottom: 24 }}>
              {/* ⏱️ عدّاد الامتحان */}
      <ExamCountdown />
        <StreakCard userId={session?.user?.id} />
      </div>


      {/* ═══ 4 بطاقات إحصائية ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        <StatCard
          icon="📚"
          value={stats?.documentsCount || 0}
          label="ملف مرفوع"
          color="#2A5C82"
        />
        <StatCard
          icon="💬"
          value={stats?.conversationsCount || 0}
          label="محادثة"
          color="#10B981"
        />
        <StatCard
          icon="❌"
          value={stats?.wrongAnswersCount || 0}
          label="سؤال للمراجعة"
          color="#EF4444"
        />
        <StatCard
          icon="💭"
          value={stats?.messagesCount || 0}
          label="رسالة"
          color="#8B5CF6"
        />
      </div>
      

      {/* ═══ Recommendation ═══ */}
      {recommendation && (
        <div style={{
          background: '#fff',
          border: `2px solid ${recommendation.color}20`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            fontSize: '2em',
            background: `${recommendation.color}15`,
            padding: 12,
            borderRadius: 12,
            lineHeight: 1,
          }}>
            {recommendation.icon}
          </div>
          <div>
            <div style={{
              fontSize: '0.8em',
              color: '#64748B',
              marginBottom: 4,
              fontWeight: 'bold',
            }}>
              توصية اليوم
            </div>
            <div style={{
              color: '#1E293B',
              fontSize: '0.95em',
              fontWeight: '500',
            }}>
              {recommendation.text}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Grid: Weak Subjects + Recent Conversations ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
        marginBottom: 24,
      }}>

        {/* توزيع الأخطاء حسب المادة */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: 22,
        }}>
          <h3 style={{
            color: '#2A5C82',
            marginTop: 0,
            marginBottom: 18,
            fontSize: '1.05em',
          }}>
            📉 أكثر المواد التي تحتاج مراجعة
          </h3>

          {topSubjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 30,
              color: '#94A3B8',
              fontSize: '0.9em',
            }}>
              لا توجد أخطاء محفوظة بعد.
              <br />
              <span style={{ fontSize: '0.85em' }}>
                جرّب اختبارًا وستظهر إحصائياتك هنا.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topSubjects.map(([subject, count]) => {
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={subject}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      fontSize: '0.88em',
                    }}>
                      <span style={{ color: '#1E293B', fontWeight: '500' }}>
                        {subject}
                      </span>
                      <span style={{ color: '#EF4444', fontWeight: 'bold' }}>
                        {count}
                      </span>
                    </div>
                    <div style={{
                      height: 8,
                      background: '#F1F5F9',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)`,
                        borderRadius: 99,
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* آخر المحادثات */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: 22,
        }}>
          <h3 style={{
            color: '#2A5C82',
            marginTop: 0,
            marginBottom: 18,
            fontSize: '1.05em',
          }}>
            💬 آخر المحادثات
          </h3>

          {!stats?.recentConversations?.length ? (
            <div style={{
              textAlign: 'center',
              padding: 30,
              color: '#94A3B8',
              fontSize: '0.9em',
            }}>
              لا توجد محادثات بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentConversations.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: 8,
                    borderRight: '3px solid #2A5C82',
                  }}
                >
                  <div style={{
                    fontSize: '0.88em',
                    color: '#1E293B',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {conv.title}
                  </div>
                  <div style={{
                    fontSize: '0.75em',
                    color: '#94A3B8',
                    marginTop: 4,
                  }}>
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

      {/* ═══ صفك الدراسي ═══ */}
      {profile?.target_subjects?.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: 22,
        }}>
          <h3 style={{
            color: '#2A5C82',
            marginTop: 0,
            marginBottom: 14,
            fontSize: '1.05em',
          }}>
            📖 موادك المستهدفة
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            {profile.target_subjects.map(s => {
              const level = profile.subject_levels?.[s];
              const color = level === 'ضعيف' ? '#EF4444'
                : level === 'متوسط' ? '#F59E0B'
                : level === 'جيد' ? '#2A5C82'
                : level === 'ممتاز' ? '#10B981'
                : '#94A3B8';
              return (
                <span
                  key={s}
                  style={{
                    background: `${color}15`,
                    color,
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    border: `1px solid ${color}30`,
                  }}
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

// ═══════════════════════════════════
// StatCard
// ═══════════════════════════════════
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: 18,
      textAlign: 'center',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.8em', marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontSize: '1.8em',
        fontWeight: 'bold',
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.82em',
        color: '#64748B',
        marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  );
}