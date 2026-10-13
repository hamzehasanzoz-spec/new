import React, { useState, useEffect } from 'react';
import {
  listWrongAnswers,
  getWrongAnswersStats,
  deleteWrongAnswer,
  clearAllWrongAnswers,
} from '../lib/wrongAnswers';
import { supabase } from '../lib/supabase';
import { exportWrongAnswersPDF } from '../lib/pdfExport';

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
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-content mb-2">
          📚 بنك الأخطاء
        </h1>
        <p className="text-sm text-content-muted">
          كل سؤال خاطئ في اختباراتك يُحفظ هنا لمراجعته لاحقًا.
        </p>
      </div>

      {/* Stats */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subjects.map(s => {
            const active = filterSubject === s;
            return (
              <button
                key={s}
                onClick={() => setFilterSubject(active ? '' : s)}
                className={`
                  p-4 rounded-lg border text-right transition-all
                  ${active
                    ? 'bg-primary/10 border-primary'
                    : 'bg-surface-card border-border hover:border-content-subtle'
                  }
                `}
              >
                <div className={`text-2xl font-bold tabular-nums mb-1 ${active ? 'text-primary' : 'text-content'}`}>
                  {stats[s]}
                </div>
                <div className={`text-xs truncate ${active ? 'text-primary' : 'text-content-muted'}`}>
                  {s}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-bold text-content">
          الأسئلة ({answers.length})
          {filterSubject && (
            <span className="text-xs font-normal text-content-muted mr-2">
              — {filterSubject}
            </span>
          )}
        </h2>

        {answers.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await exportWrongAnswersPDF(answers, null, filterSubject);
                } catch (err) {
                  alert('فشل التصدير: ' + err.message);
                }
              }}
              className="text-xs bg-primary hover:bg-primary-light text-white font-semibold px-4 py-2 rounded-md transition-colors"
            >
              📄 تصدير PDF
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs bg-transparent border border-danger/40 text-danger hover:bg-danger/10 font-semibold px-4 py-2 rounded-md transition-colors"
            >
              🗑 حذف الكل
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 mx-auto border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-content-muted mt-4">جاري التحميل...</p>
        </div>
      ) : answers.length === 0 ? (
        <div className="bg-surface-card border border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">🎯</div>
          <div className="text-sm text-content-muted mb-1">
            لا توجد أسئلة محفوظة بعد.
          </div>
          <div className="text-xs text-content-subtle">
            ابدأ اختبارًا وستُحفظ أسئلتك الخاطئة تلقائيًا.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {answers.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-surface-card border border-border rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 cursor-pointer hover:bg-surface-soft transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-content-subtle mb-1.5 flex flex-wrap items-center gap-x-2">
                      {item.subject}
                      {item.topic && <span>• {item.topic}</span>}
                      <span>
                        • {new Date(item.created_at).toLocaleDateString('ar-EG', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-content leading-relaxed">
                      {idx + 1}. {item.question}
                    </div>
                  </div>
                  <div className={`text-primary text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>

                {/* Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-border space-y-2">
                    {item.options.map((opt, oi) => {
                      const isCorrect = oi === item.correct_index;
                      const isUserWrong = oi === item.user_answer_index;

                      let cls = 'bg-surface-soft border-border text-content-muted';
                      let prefix = '';

                      if (isCorrect) {
                        cls = 'bg-success/10 border-success/40 text-success';
                        prefix = '✅ ';
                      } else if (isUserWrong) {
                        cls = 'bg-danger/10 border-danger/40 text-danger';
                        prefix = '❌ ';
                      }

                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 p-3 rounded-md border text-sm ${cls}`}
                        >
                          <span className="font-bold flex-shrink-0">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          <span className="flex-1">{prefix}{opt}</span>
                          {isUserWrong && !isCorrect && (
                            <span className="text-xs opacity-75 flex-shrink-0">إجابتك</span>
                          )}
                        </div>
                      );
                    })}

                    {item.explanation && (
                      <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs text-primary leading-relaxed">
                        💡 {item.explanation}
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-xs border border-danger/40 text-danger hover:bg-danger/10 px-4 py-2 rounded-md font-semibold transition-colors mt-2"
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