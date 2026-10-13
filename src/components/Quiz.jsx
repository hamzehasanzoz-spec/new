import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { saveManyWrongAnswers } from '../lib/wrongAnswers';
const SUBJECTS = [
  'الداخلية العصبية', 'الداخلية القلبية', 'الداخلية الهضمية', 'الداخلية الصدرية',
  'الجراحة العامة', 'الأطفال', 'النسائية والتوليد', 'الفارماكولوجي', 'الباثولوجي',
  'المايكروبيولوجي', 'الفيزيولوجي',
];
import { logActivity } from '../lib/streak';
const DIFFICULTIES = ['سهل', 'متوسط', 'صعب'];
const NUM_OPTIONS = [5, 10, 15, 20];
import { exportQuizPDF } from '../lib/pdfExport';

export default function Quiz({ profile, setActiveWork }) {
  const [stage, setStage] = useState('setup'); // setup | loading | running | results
  const [error, setError] = useState('');
  
  // إعدادات
  const [subject, setSubject] = useState(profile?.target_subjects?.[0] || SUBJECTS[0]);
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('متوسط');
  const [useFiles, setUseFiles] = useState(true);

  // نتيجة الاختبار
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [sourcesUsed, setSourcesUsed] = useState('');

  // ─── التوليد ───
  const handleGenerate = async () => {
    setError('');
    setStage('loading');

    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) throw new Error('انتهت الجلسة');

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession.access_token}`,
        },
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          numQuestions,
          difficulty,
          useFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (!data.questions?.length) throw new Error('لم يتم توليد أسئلة');

      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
      setSourcesUsed(data.sourcesUsed);
            setStage('running');
      if (setActiveWork) setActiveWork({ type: 'اختبار' });
    } catch (err) {
      setError(err.message);
      setStage('setup');
    }
  };

  // ─── إجابة سؤال ───
  const handleAnswer = (qIdx, optIdx) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[qIdx] = optIdx;
      return copy;
    });
  };

  // ─── إنهاء الاختبار ───
  const handleSubmit = async () => {
  const unanswered = answers.filter(a => a === -1).length;
  if (unanswered > 0) {
    if (!confirm(`لديك ${unanswered} سؤال غير مُجاب. إنهاء الاختبار؟`)) return;
  }

  // حفظ الأسئلة الخاطئة في بنك الأخطاء
  try {
    const wrongOnes = questions
      .map((q, i) => ({ q, i, userAns: answers[i] }))
      .filter(({ q, i }) => answers[i] !== q.correct)
      .map(({ q, i, userAns }) => ({
        question: q.q,
        options: q.options,
        correctIndex: q.correct,
        userAnswerIndex: userAns,
        explanation: q.explanation,
      }));

    if (wrongOnes.length > 0) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession?.user?.id) {
        await saveManyWrongAnswers(
          freshSession.user.id,
          wrongOnes,
          subject,
          topic
        );
      }
    }
  } catch (err) {
    console.error('فشل حفظ الأخطاء:', err);
  }

          setStage('results');
    if (setActiveWork) setActiveWork(null);
    
    // 🔥 سجّل النشاط
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.id) await logActivity(s.user.id, 'quiz');
    } catch (err) {
      console.error(err);
    }
  };                                

  // ─── إعادة ───
  const handleReset = () => {
    if (setActiveWork) setActiveWork(null);
    setStage('setup');
    setQuestions([]);
    setAnswers([]);
    setError('');
  };

  // ─── حساب النتيجة ───
  const score = questions.reduce((acc, q, i) => 
    acc + (answers[i] === q.correct ? 1 : 0), 0
  );
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // ═══════════════════════════════════════════════
  // STAGE: Setup (اختيار الإعدادات)
  // ═══════════════════════════════════════════════
  if (stage === 'setup') {
    return (
      <div style={{ maxWidth: 700, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        <div style={{
          background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
          color: '#fff', padding: 30, borderRadius: 16, marginBottom: 25,
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5em' }}>🎯 مولّد الاختبارات</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
            اختر المادة والموضوع، وسيولّد الذكاء الاصطناعي أسئلة MCQ من ملفاتك أو من المعرفة العامة.
          </p>
        </div>

        <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 14, border: '1px solid var(--border)' }}>
          {/* المادة */}
          <Field label="المادة">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={selectStyle}
            >
              {SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          {/* الموضوع */}
          <Field label="الموضوع (اختياري)">
            <input
              type="text"
              placeholder="مثال: فشل القلب، الربو، السكري..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              style={inputStyle}
            />
          </Field>

          {/* عدد الأسئلة */}
          <Field label="عدد الأسئلة">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {NUM_OPTIONS.map(n => (
  <button
    key={n}
    type="button"
    onClick={() => setNumQuestions(n)}
    style={{
      padding: '10px 0',
      borderRadius: 8,
      border: numQuestions === n ? '2px solid var(--primary)' : '1px solid var(--border)',
      background: numQuestions === n ? 'var(--bg-elevated)' : 'var(--bg-subtle)',
      color: 'var(--text)',
      cursor: 'pointer',
      fontWeight: numQuestions === n ? 'bold' : 'normal',
      fontFamily: 'inherit',
    }}
  >
    {n}
  </button>
))}
            </div>
          </Field>

          {/* الصعوبة */}
          <Field label="مستوى الصعوبة">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {DIFFICULTIES.map(d => (
  <button
    key={d}
    type="button"
    onClick={() => setDifficulty(d)}
    style={{
      padding: '10px 0',
      borderRadius: 8,
      border: difficulty === d ? '2px solid var(--primary)' : '1px solid var(--border)',
      background: difficulty === d ? 'var(--bg-elevated)' : 'var(--bg-subtle)',
      color: 'var(--text)',
      cursor: 'pointer',
      fontWeight: difficulty === d ? 'bold' : 'normal',
      fontFamily: 'inherit',
    }}
  >
    {d}
  </button>
))}
            </div>
          </Field>

          {/* استخدام الملفات */}
          <Field label="المصدر">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              background: 'var(--bg)',
              borderRadius: 8,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={useFiles}
                onChange={e => setUseFiles(e.target.checked)}
              />
              <span style={{ fontSize: '0.9em' }}>
                استخدم ملفاتي المرفوعة كمصدر أساسي (RAG)
              </span>
            </label>
          </Field>

          {error && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: 8,
              fontSize: '0.88em',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            style={{
              width: '100%',
              marginTop: 20,
              padding: 14,
              background: '#2A5C82',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🚀 توليد الاختبار
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Loading
  // ═══════════════════════════════════════════════
  if (stage === 'loading') {
    return (
      <div style={{
        maxWidth: 500,
        margin: '100px auto',
        textAlign: 'center',
        padding: 25,
        direction: 'rtl',
      }}>
        <div style={{ fontSize: '3em', marginBottom: 20 }}>🧠</div>
        <h2 style={{ 	color: 'var(--primary)' }}>جاري توليد الأسئلة...</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          يبحث الذكاء الاصطناعي في ملفاتك ويصيغ الأسئلة
        </p>
        <div style={{
          width: 50,
          height: 50,
          margin: '20px auto',
          border: '4px solid #E2E8F0',
          borderTop: '4px solid #2A5C82',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Running (الأسئلة)
  // ═══════════════════════════════════════════════
  if (stage === 'running') {
    const answered = answers.filter(a => a !== -1).length;
    return (
      <div style={{ maxWidth: 800, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        {/* Header */}
        <div style={{
          background: '#2A5C82',
          color: '#fff',
          padding: 18,
          borderRadius: 14,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{subject}</div>
            {topic && <div style={{ fontSize: '0.85em', opacity: 0.9 }}>{topic}</div>}
          </div>
          <div style={{ fontSize: '0.9em' }}>
            {answered} / {total} تمت الإجابة
          </div>
        </div>

        {/* شريط التقدم */}
        <div style={{
          height: 6,
          background: '#E2E8F0',
          borderRadius: 99,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(answered / total) * 100}%`,
            background: '#10B981',
            transition: 'width 0.3s',
          }} />
        </div>

        {/* الأسئلة */}
        {questions.map((q, qi) => (
          <div
            key={qi}
            style={{
              background: 'var(--bg-elevated)',
              padding: 20,
              borderRadius: 14,
              border: '1px solid var(--border)',
              marginBottom: 16,
            }}
          >
            <div style={{
              fontWeight: 'bold',
              	color: 'var(--primary)',
              marginBottom: 12,
              fontSize: '1em',
            }}>
              {qi + 1}. {q.q}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                return (
                  <label
                    key={oi}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: selected ? '2px solid #2A5C82' : '1px solid var(--border)',
                      background: selected ? '#EFF6FF' : '#F8FAFC',
                      cursor: 'pointer',
                      fontSize: '0.92em',
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={selected}
                      onChange={() => handleAnswer(qi, oi)}
                    />
                    <span>
                      <strong>{String.fromCharCode(65 + oi)}.</strong> {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* أزرار */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: 14,
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: '1em',
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2,
              padding: 14,
              background: '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✅ إنهاء وعرض النتيجة
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Results (النتيجة)
  // ═══════════════════════════════════════════════
  if (stage === 'results') {
    const color = percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444';
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '💪' : '📚';
    const message = percentage >= 80 ? 'ممتاز!' : percentage >= 60 ? 'جيد، تحتاج مراجعة' : 'يحتاج مراجعة شاملة';

    return (
      <div style={{ maxWidth: 900, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        {/* بطاقة النتيجة */}
        <div style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          color: '#fff',
          padding: 40,
          borderRadius: 20,
          textAlign: 'center',
          marginBottom: 30,
        }}>
          <div style={{ fontSize: '3em', marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontSize: '3em', fontWeight: 'bold', marginBottom: 8 }}>
            {score} / {total}
          </div>
          <div style={{ fontSize: '1.4em', marginBottom: 6 }}>{percentage}%</div>
          <div style={{ opacity: 0.9 }}>{message}</div>
        </div>

        {/* الأخطاء */}
        <h3 style={{ 	color: 'var(--primary)', marginBottom: 16 }}>
          📋 الأسئلة الخاطئة ({total - score})
        </h3>

        {total - score === 0 ? (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            padding: 20,
            borderRadius: 12,
            textAlign: 'center',
            color: '#065F46',
          }}>
            🏆 إجاباتك صحيحة بالكامل!
          </div>
        ) : (
          questions.map((q, qi) => {
            const userAns = answers[qi];
            const isCorrect = userAns === q.correct;
            if (isCorrect) return null;

            return (
              <div
                key={qi}
                style={{
                  background: 'var(--bg-elevated)',
                  padding: 20,
                  borderRadius: 14,
                  border: '2px solid #FECACA',
                  marginBottom: 14,
                }}
              >
                <div style={{
                  fontWeight: 'bold',
                  color: '#991B1B',
                  marginBottom: 10,
                }}>
                  ❌ سؤال {qi + 1}: {q.q}
                </div>

                <div style={{
                  padding: 12,
                  background: '#FEF2F2',
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: '0.9em',
                }}>
                  <strong>إجابتك:</strong>{' '}
                  {userAns === -1 ? 'لم تجب' : `${String.fromCharCode(65 + userAns)}. ${q.options[userAns]}`}
                </div>

                <div style={{
                  padding: 12,
                  background: '#F0FDF4',
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: '0.9em',
                }}>
                  <strong>الإجابة الصحيحة:</strong>{' '}
                  {String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}
                </div>

                {q.explanation && (
                  <div style={{
                    padding: 12,
                    background: '#EFF6FF',
                    borderRadius: 8,
                    fontSize: '0.88em',
                    color: '#1E40AF',
                  }}>
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* الإجراءات */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={async () => {
              try {
                await exportQuizPDF({
                  subject,
                  topic,
                  questions,
                  answers,
                  score,
                  total,
                  percentage,
                  profile,
                });
              } catch (err) {
                alert('فشل التصدير: ' + err.message);
              }
            }}
            style={{
              flex: 1,
              padding: 14,
              background: '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            📄 تصدير PDF
          </button>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: 14,
              background: '#2A5C82',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🎯 اختبار جديد
          </button>
        </div>

        {sourcesUsed === 'files' && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: '#F0FDF4',
            borderRadius: 8,
            fontSize: '0.85em',
            color: '#065F46',
            textAlign: 'center',
          }}>
            📚 تم توليد الأسئلة من ملفاتك المرفوعة
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────
// مكونات مساعدة
// ─────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        fontWeight: 'bold',
        marginBottom: 8,
        color: 'var(--text)',
        fontSize: '0.92em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: '0.95em',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: 'var(--bg-subtle)',
  color: 'var(--text)',
};

const selectStyle = {
  ...inputStyle,
  background: 'var(--bg-subtle)',
  cursor: 'pointer',
};