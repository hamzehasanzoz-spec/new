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
      return { icon: '📚', 	color: 'var(--primary)', text: 'ابدأ برفع ملفاتك الدراسية ثم جرّب اختبارًا.' };
    if (total === 0 && stats.documentsCount > 0)
      return { icon: '🎯', color: '#10B981', text: 'ملفاتك جاهزة! جرّب اختبارًا لتقييم مستواك.' };
    if (topSubjects.length > 0 && topSubjects[0][1] >= 3)
      return { icon: '⚠️', color: '#F59E0B', text: `ركّز على "${topSubjects[0][0]}" — لديك ${topSubjects[0][1]} أسئلة خاطئة.` };
    if (total > 0)
      return { icon: '💪', color: '#10B981', text: `أداء جيد! لديك ${total} سؤال للمراجعة.` };
    return null;
  };

  const recommendation = getRecommendation();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100, color: 'var(--text-muted)' }}>
        جاري تحميل الإحصائيات...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1100,
      margin: '20px auto',
      padding: 0,
      direction: 'rtl',
      textAlign: 'right',
    }}>

      {/* ═══ Header مع البادجات ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '1.4em', fontWeight: 800 }}>
              أهلاً، د. {profile?.full_name || 'زميلنا'} 👋
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.88em' }}>
              {profile?.current_stage || 'مرحلتك'} — {profile?.university || 'جامعتك'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ExamCountdown />
            <StreakCard userId={session?.user?.id} />
          </div>
        </div>
      </div>

      {/* ═══ 4 بطاقات إحصائية ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <StatCard icon="📚" value={stats?.documentsCount || 0} label="ملف مرفوع" color="#2A5C82" />
        <StatCard icon="💬" value={stats?.conversationsCount || 0} label="محادثة" color="#10B981" />
        <StatCard icon="❌" value={stats?.wrongAnswersCount || 0} label="للمراجعة" color="#EF4444" />
        <StatCard icon="💭" value={stats?.messagesCount || 0} label="رسالة" color="#8B5CF6" />
      </div>

      {/* ═══ التوصية ═══ */}
      {recommendation && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: `2px solid ${recommendation.color}30`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            fontSize: '1.6em',
            background: `${recommendation.color}15`,
            padding: 10,
            borderRadius: 10,
            lineHeight: 1,
          }}>
            {recommendation.icon}
          </div>
          <div>
            <div style={{
              fontSize: '0.72em',
              color: 'var(--text-muted)',
              marginBottom: 3,
              fontWeight: 'bold',
            }}>
              توصية اليوم
            </div>
            <div style={{
              color: 'var(--text)',
              fontSize: '0.9em',
              fontWeight: 500,
            }}>
              {recommendation.text}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Grid: ضعيف + محادثات ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 20,
      }}>

        {/* المواد الضعيفة */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
        }}>
          <h3 style={{
            color: 'var(--primary)',
            marginTop: 0,
            marginBottom: 16,
            fontSize: '1em',
          }}>
            📉 أكثر المواد التي تحتاج مراجعة
          </h3>

          {topSubjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 24,
              color: 'var(--text-subtle)',
              fontSize: '0.88em',
            }}>
              لا توجد أخطاء محفوظة بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topSubjects.map(([subject, count]) => {
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={subject}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 5,
                      fontSize: '0.85em',
                    }}>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {subject}
                      </span>
                      <span style={{ color: '#EF4444', fontWeight: 'bold' }}>
                        {count}
                      </span>
                    </div>
                    <div style={{
                      height: 6,
                      background: 'var(--bg-subtle)',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)',
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
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
        }}>
          <h3 style={{
            color: 'var(--primary)',
            marginTop: 0,
            marginBottom: 16,
            fontSize: '1em',
          }}>
            💬 آخر المحادثات
          </h3>

          {!stats?.recentConversations?.length ? (
            <div style={{
              textAlign: 'center',
              padding: 24,
              color: 'var(--text-subtle)',
              fontSize: '0.88em',
            }}>
              لا توجد محادثات بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recentConversations.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                    borderRight: '3px solid var(--primary)',
                  }}
                >
                  <div style={{
                    fontSize: '0.85em',
                    color: 'var(--text)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {conv.title}
                  </div>
                  <div style={{
                    fontSize: '0.72em',
                    color: 'var(--text-subtle)',
                    marginTop: 3,
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

      {/* ═══ المواد المستهدفة ═══ */}
      {profile?.target_subjects?.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
        }}>
          <h3 style={{
            color: 'var(--primary)',
            marginTop: 0,
            marginBottom: 12,
            fontSize: '1em',
          }}>
            📖 موادك المستهدفة
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                    background: `${color}20`,
                    color,
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: '0.82em',
                    fontWeight: 'bold',
                    border: `1px solid ${color}40`,
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

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 16,
      textAlign: 'center',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.6em', marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: '1.6em',
        fontWeight: 'bold',
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.78em',
        color: 'var(--text-muted)',
        marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  );
}