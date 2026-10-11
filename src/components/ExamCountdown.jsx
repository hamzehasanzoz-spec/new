import React, { useState, useEffect } from 'react';

const EXAM_DATE = new Date('2026-12-20T08:00:00');

export default function ExamCountdown() {
  const [timeLeft, setTimeLeft] = useState(calculate());

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, []);

  function calculate() {
    const diff = EXAM_DATE - new Date();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isOver: false,
    };
  }

  const { days, hours, minutes, seconds, isOver } = timeLeft;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
      color: '#fff',
      borderRadius: 12,
      fontSize: '0.82em',
      fontWeight: 'bold',
      boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
    }}>
      <span style={{ fontSize: '1.1em' }}>⏱️</span>
      {isOver ? (
        <span>الامتحان اليوم!</span>
      ) : (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {days}<span style={{ opacity: 0.75, fontWeight: 500 }}>ي</span>
          {' '}
          {String(hours).padStart(2, '0')}<span style={{ opacity: 0.75, fontWeight: 500 }}>س</span>
          {' '}
          {String(minutes).padStart(2, '0')}<span style={{ opacity: 0.75, fontWeight: 500 }}>د</span>
        </span>
      )}
    </div>
  );
}