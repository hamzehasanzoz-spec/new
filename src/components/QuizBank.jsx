import React, { useState, useEffect } from 'react';
import {
  listWrongAnswers,
  getWrongAnswersStats,
  deleteWrongAnswer,
  clearAllWrongAnswers,
} from '../lib/wrongAnswers';
import { supabase } from '../lib/supabase';

export default function QuizBank({ session }) {
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [stats, setStats] = useState({});
  const [filterSubject, setFilterSubject] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const userId = session?.user?.id;

  useEffect(() => {
    loadData();
  }, [filterSubject]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        listWrongAnswers(userId, { subject: filterSubject || undefined }),
        getWrongAnswersStats(userId),
      ]);
      setAnswers(list);
      setStats(statsData);
    } catch (err) {
      console.error('فشل التحميل:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا السؤال؟')) return;
    try {
      await deleteWrongAnswer(id);
      setAnswers(prev => prev.filter(a => a.id !== id));
      const newStats = await getWrongAnswersStats(userId);
      setStats(newStats);
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('حذف جميع الأسئلة الخاطئة؟ لا يمكن التراجع.')) return;
    try {
      await clearAllWrongAnswers(userId);
      setAnswers([]);
      setStats({});
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  const subjects = Object.keys(stats);

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 25, direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff', padding: 30, borderRadius: 16, marginBottom: 25,
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.5em' }}>📚 بنك الأخطاء</h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
          كل سؤال خاطئ في اختباراتك يُحفظ هنا لمراجعته لاحقًا.
        </p>
      </div>

      {/* الإحصائيات */}
      {subjects.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setFilterSubject(filterSubject === s ? '' : s)}
              style={{
                padding: 14,
                background: filterSubject === s ? '#EFF6FF' : '#fff',
                border: filterSubject === s ? '2px solid #2A5C82' : '1px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '1.6em', fontWeight: 'bold', 	color: 'var(--primary)' }}>
                {stats[s]}
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>
                {s}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* أدوات */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <h2 style={{ margin: 0, 	color: 'var(--primary)', fontSize: '1.1em' }}>
          الأسئلة ({answers.length})
          {filterSubject && <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}> — {filterSubject}</span>}
        </h2>

        {answers.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: '1px solid #EF4444',
              color: '#EF4444',
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            🗑 حذف الكل
          </button>
        )}
      </div>

      {/* القائمة */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
          جاري التحميل...
        </div>
      ) : answers.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 50,
          textAlign: 'center',
          	color: 'var(--text-subtle)',
        }}>
          <div style={{ fontSize: '3em', marginBottom: 12 }}>🎯</div>
          <div>لا توجد أسئلة محفوظة بعد.</div>
          <div style={{ fontSize: '0.85em', marginTop: 8 }}>
            ابدأ اختبارًا وستُحفظ أسئلتك الخاطئة تلقائيًا.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {answers.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* رأس السؤال */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  style={{
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.75em',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}>
                      {item.subject}
                      {item.topic && ` • ${item.topic}`}
                      {' • '}
                      {new Date(item.created_at).toLocaleDateString('ar-EG', {
                        day: 'numeric', month: 'short',
                      })}
                    </div>
                    <div style={{
                      fontWeight: 'bold',
                      color: 'var(--text)',
                      fontSize: '0.94em',
                      lineHeight: 1.5,
                    }}>
                      {idx + 1}. {item.question}
                    </div>
                  </div>
                  <div style={{
                    	color: 'var(--primary)',
                    fontSize: '1.2em',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                  }}>
                    ▼
                  </div>
                </div>

                {/* التفاصيل */}
                {isExpanded && (
                  <div style={{
                    padding: '0 16px 16px',
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: 12,
                  }}>
                    {/* الخيارات */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {item.options.map((opt, oi) => {
                        const isCorrect = oi === item.correct_index;
                        const isUserWrong = oi === item.user_answer_index;

                        let bg = '#F8FAFC';
                        let border = '1px solid var(--border)';
                        let color = '#1E293B';

                        if (isCorrect) {
                          bg = '#F0FDF4';
                          border = '2px solid #10B981';
                          color = '#065F46';
                        } else if (isUserWrong) {
                          bg = '#FEF2F2';
                          border = '2px solid #EF4444';
                          color = '#991B1B';
                        }

                        return (
                          <div
                            key={oi}
                            style={{
                              padding: '8px 12px',
                              background: bg,
                              border,
                              borderRadius: 8,
                              fontSize: '0.88em',
                              color,
                            }}
                          >
                            <strong>{String.fromCharCode(65 + oi)}.</strong> {opt}
                            {isCorrect && ' ✅'}
                            {isUserWrong && !isCorrect && ' ❌ إجابتك'}
                          </div>
                        );
                      })}
                    </div>

                    {/* الشرح */}
                    {item.explanation && (
                      <div style={{
                        marginTop: 10,
                        padding: 12,
                        background: '#EFF6FF',
                        borderRadius: 8,
                        fontSize: '0.86em',
                        color: '#1E40AF',
                        lineHeight: 1.6,
                      }}>
                        💡 {item.explanation}
                      </div>
                    )}

                    {/* حذف */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      style={{
                        marginTop: 12,
                        background: 'transparent',
                        border: '1px solid #EF4444',
                        color: '#EF4444',
                        padding: '6px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: '0.82em',
                      }}
                    >
                      🗑 حذف هذا السؤال
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}