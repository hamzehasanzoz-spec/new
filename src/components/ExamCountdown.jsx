import React, { useState, useEffect } from 'react';

// 🎯 تاريخ الامتحان — قابل للتعديل
const EXAM_DATE = new Date('2026-12-20T08:00:00');

export default function ExamCountdown({ compact = false }) {
  const [timeLeft, setTimeLeft] = useState(calculate());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculate());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function calculate() {
    const now = new Date();
    const diff = EXAM_DATE - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isOver: false,
    };
  }

  const { days, hours, minutes, seconds, isOver } = timeLeft;

  // ═══ Compact mode (لـ Nav) ═══
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
        color: '#fff',
        borderRadius: 20,
        fontSize: '0.82em',
        fontWeight: 'bold',
      }}>
        <span>⏱️</span>
        <span>{isOver ? 'الامتحان اليوم!' : `${days} يوم`}</span>
      </div>
    );
  }

  // ═══ Full card ═══
  return (
    <div style={{
      background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
      color: '#fff',
      padding: 20,
      borderRadius: 16,
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.4em' }}>⏱️</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.05em' }}>
              {isOver ? '🎓 يوم الامتحان!' : 'العدّ التنازلي للامتحان'}
            </div>
            <div style={{ fontSize: '0.78em', opacity: 0.85, marginTop: 2 }}>
              20 ديسمبر 2026 — NMLE
            </div>
          </div>
        </div>
      </div>

      {!isOver ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}>
          <TimeBox value={days} label="يوم" />
          <TimeBox value={hours} label="ساعة" />
          <TimeBox value={minutes} label="دقيقة" />
          <TimeBox value={seconds} label="ثانية" />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: 20,
          fontSize: '1.1em',
          fontWeight: 'bold',
        }}>
          بالتوفيق! 🎉
        </div>
      )}
    </div>
  );
}

function TimeBox({ value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 10,
      padding: '12px 8px',
      textAlign: 'center',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        fontSize: '1.6em',
        fontWeight: 800,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        fontSize: '0.7em',
        opacity: 0.85,
        marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}