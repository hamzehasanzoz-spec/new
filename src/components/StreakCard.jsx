import React, { useState, useEffect, useRef } from 'react';
import { getStreak } from '../lib/streak';

export default function StreakCard({ userId }) {
  const [streak, setStreak] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const load = async () => {
    try {
      const data = await getStreak(userId);
      setStreak(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!streak) return null;

  const { current, longest, todayDone, days } = streak;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Badge صغير قابل للنقر */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: current > 0 ? '#FEF3C7' : 'var(--bg-elevated)',
          border: `1px solid ${current > 0 ? '#F59E0B' : 'var(--border)'}`,
          borderRadius: 12,
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.85em',
          color: current > 0 ? '#92400E' : 'var(--text-muted)',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '1.15em', filter: current > 0 ? 'none' : 'grayscale(0.5)' }}>
          🔥
        </span>
        <span>{current}</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 320,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 18,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* رأس */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.8em' }}>🔥</span>
              <div>
                <div style={{
                  fontSize: '1.3em',
                  fontWeight: 800,
                  color: 'var(--text)',
                  lineHeight: 1,
                }}>
                  {current}
                </div>
                <div style={{
                  fontSize: '0.72em',
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}>
                  {current === 1 ? 'يوم متتالي' : 'أيام متتالية'}
                </div>
              </div>
            </div>
            <div style={{
              background: 'var(--bg-subtle)',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: '0.72em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}>
              🏆 {longest}
            </div>
          </div>

          {/* حالة اليوم */}
          <div style={{
            background: todayDone ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${todayDone ? '#10B981' : '#FCA5A5'}`,
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: '0.78em',
            color: todayDone ? '#065F46' : '#991B1B',
            marginBottom: 12,
            fontWeight: 600,
            textAlign: 'center',
          }}>
            {todayDone ? '✅ أحسنت! أنجزت نشاطًا اليوم' : '⚠️ لم تُنجز أي نشاط اليوم'}
          </div>

          {/* خريطة الأيام */}
          <div style={{
            fontSize: '0.7em',
            color: 'var(--text-muted)',
            marginBottom: 6,
            fontWeight: 600,
          }}>
            آخر 30 يومًا
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 3,
          }}>
            {days.map(d => (
              <div
                key={d.date}
                title={d.date}
                style={{
                  aspectRatio: '1',
                  borderRadius: 3,
                  background: d.active ? '#F59E0B' : 'var(--bg-subtle)',
                  border: d.isToday ? '2px solid #92400E' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}