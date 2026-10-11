import React, { useState, useEffect } from 'react';
import { getStreak } from '../lib/streak';

export default function StreakCard({ userId, compact = false }) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStreak(userId);
      setStreak(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #E2E8F0',
        borderRadius: 14, padding: 18,
        textAlign: 'center', color: '#94A3B8', fontSize: '0.85em',
      }}>
        جاري التحميل...
      </div>
    );
  }

  if (!streak) return null;

  const { current, longest, todayDone, days } = streak;

  // ═══ Compact mode (يُستخدم في الـ Nav مثلاً) ═══
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: current > 0 ? '#FEF3C7' : '#F1F5F9',
        borderRadius: 20,
        fontSize: '0.85em',
        fontWeight: 'bold',
        color: current > 0 ? '#92400E' : '#64748B',
      }}>
        <span style={{ fontSize: '1.1em' }}>🔥</span>
        <span>{current}</span>
      </div>
    );
  }

  // ═══ Full card ═══
  return (
    <div style={{
      background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
      border: '2px solid #F59E0B',
      borderRadius: 16,
      padding: 20,
    }}>
      {/* العداد الرئيسي */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: '2.5em',
            lineHeight: 1,
            filter: current > 0 ? 'none' : 'grayscale(0.7)',
          }}>
            🔥
          </div>
          <div>
            <div style={{
              fontSize: '1.6em',
              fontWeight: 800,
              color: '#92400E',
              lineHeight: 1,
            }}>
              {current}
            </div>
            <div style={{
              fontSize: '0.78em',
              color: '#92400E',
              opacity: 0.8,
              marginTop: 2,
            }}>
              {current === 1 ? 'يوم متتالي' : 'أيام متتالية'}
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #F59E0B',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: '0.75em',
          color: '#92400E',
          fontWeight: 600,
        }}>
          🏆 الأفضل: {longest} يوم
        </div>
      </div>

      {/* رسالة الحالة */}
      <div style={{
        background: todayDone ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${todayDone ? '#10B981' : '#FCA5A5'}`,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: '0.82em',
        color: todayDone ? '#065F46' : '#991B1B',
        marginBottom: 16,
        fontWeight: 600,
        textAlign: 'center',
      }}>
        {todayDone
          ? `✅ أحسنت! أنجزت نشاطًا اليوم — حافظ على سلسلتك`
          : `⚠️ لم تُنجز أي نشاط اليوم — افتح اختبارًا أو محادثة!`}
      </div>

      {/* خريطة الأيام */}
      <div>
        <div style={{
          fontSize: '0.75em',
          color: '#92400E',
          marginBottom: 8,
          fontWeight: 600,
        }}>
          آخر 30 يومًا
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 4,
        }}>
          {days.map(d => (
            <div
              key={d.date}
              title={d.date}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: d.active ? '#F59E0B' : '#E5E7EB',
                border: d.isToday ? '2px solid #92400E' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6em',
                color: d.active ? '#fff' : '#94A3B8',
                fontWeight: 'bold',
              }}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}