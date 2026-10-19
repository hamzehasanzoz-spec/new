import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { saveManyWrongAnswers } from '../lib/wrongAnswers';
import { logActivity } from '../lib/streak';
import { exportQuizPDF } from '../lib/pdfExport';

const SUBJECTS = [
  'الداخلية العصبية', 'الداخلية القلبية', 'الداخلية الهضمية', 'الداخلية الصدرية',
  'الجراحة العامة', 'الأطفال', 'النسائية والتوليد', 'الفارماكولوجي', 'الباثولوجي',
  'المايكروبيولوجي', 'الفيزيولوجي',
];

const DIFFICULTIES = ['سهل', 'متوسط', 'صعب'];
const NUM_OPTIONS = [5, 10, 15, 20];

export default function Quiz({ profile, setActiveWork }) {
  const [stage, setStage] = useState('setup');
  const [error, setError] = useState('');

  const [subject, setSubject] = useState(profile?.target_subjects?.[0] || SUBJECTS[0]);
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('متوسط');
  const [useFiles, setUseFiles] = useState(true);
  const [professors, setProfessors] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [sourcesUsed, setSourcesUsed] = useState('');

  useEffect(() => {
    const fetchProfs = async () => {
      if (!profile?.faculty_slug) return;
      const { data } = await supabase.from('professors').select('*, professor_styles(*)').eq('faculty_slug', profile.faculty_slug);
      if (data) setProfessors(data.filter(p => p.professor_styles && p.professor_styles.length > 0));
    };
    fetchProfs();
  }, [profile?.faculty_slug]);

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
          professor: selectedProf ? { name: selectedProf.name, ...selectedProf.professor_styles[0] } : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error((data.error || `HTTP ${res.status}`) + (data.details ? ` - ${data.details}` : ''));
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

  const handleAnswer = (qIdx, optIdx) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[qIdx] = optIdx;
      return copy;
    });
  };

  const handleSubmit = async () => {
    const unanswered = answers.filter(a => a === -1).length;
    if (unanswered > 0) {
      if (!confirm(`لديك ${unanswered} سؤال غير مُجاب. إنهاء الاختبار؟`)) return;
    }

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
          await saveManyWrongAnswers(freshSession.user.id, wrongOnes, subject, topic);
        }
      }
    } catch (err) {
      console.error('فشل حفظ الأخطاء:', err);
    }

    setStage('results');
    if (setActiveWork) setActiveWork(null);

    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.id) await logActivity(s.user.id, 'quiz');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (setActiveWork) setActiveWork(null);
    setStage('setup');
    setQuestions([]);
    setAnswers([]);
    setError('');
  };

  const score = questions.reduce((acc, q, i) =>
    acc + (answers[i] === q.correct ? 1 : 0), 0
  );
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // ═══════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════
  if (stage === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-5" dir="rtl">

        {/* Header */}
        <div className="bg-surface-card border border-border rounded-lg p-6">
          <h1 className="text-2xl font-bold text-content mb-2">
            🎯 مولّد الاختبارات
          </h1>
          <p className="text-sm text-content-muted">
            اختر المادة والموضوع، وسيولّد الذكاء الاصطناعي أسئلة MCQ من ملفاتك أو من المعرفة العامة.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-card border border-border rounded-lg p-6 space-y-5">

          {/* Subject */}
          <Field label="المادة">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          {/* Topic */}
          <Field label="الموضوع (اختياري)">
            <input
              type="text"
              placeholder="مثال: فشل القلب، الربو، السكري..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </Field>

          {/* Num Questions */}
          <Field label="عدد الأسئلة">
            <div className="grid grid-cols-4 gap-2">
              {NUM_OPTIONS.map(n => {
                const active = numQuestions === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumQuestions(n)}
                    className={`
                      py-2.5 rounded-md text-sm font-semibold transition-all border
                      ${active
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-soft text-content-muted border-border hover:border-content-subtle'
                      }
                    `}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Difficulty */}
          <Field label="مستوى الصعوبة">
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => {
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`
                      py-2.5 rounded-md text-sm font-semibold transition-all border
                      ${active
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-soft text-content-muted border-border hover:border-content-subtle'
                      }
                    `}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* اختيار الدكتور */}
          {professors.length > 0 && (
            <Field label="شخصية الدكتور (اختياري)">
              <select
                value={selectedProf?.id || ''}
                onChange={(e) => setSelectedProf(professors.find(p => p.id === e.target.value) || null)}
                className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary"
              >
                <option value="">بدون شخصية (أسئلة عامة)</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>د. {p.name} - {p.subject}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Use Files */}
          <Field label="المصدر">
            <label className="flex items-center gap-3 p-3 bg-surface-soft border border-border rounded-md cursor-pointer hover:border-content-subtle transition-colors">
              <input
                type="checkbox"
                checked={useFiles}
                onChange={e => setUseFiles(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-sm text-content">
                استخدم ملفاتي المرفوعة كمصدر أساسي (RAG)
              </span>
            </label>
          </Field>

          {/* Error */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-md p-3 flex items-center gap-2">
              <span className="text-danger">⚠️</span>
              <span className="text-sm text-danger">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-md transition-colors shadow-sm"
          >
            🚀 توليد الاختبار
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════
  if (stage === 'loading') {
    return (
      <div className="max-w-md mx-auto text-center py-16" dir="rtl">
        <div className="text-5xl mb-6">🧠</div>
        <h2 className="text-xl font-bold text-content mb-2">
          جاري توليد الأسئلة...
        </h2>
        <p className="text-sm text-content-muted mb-8">
          يبحث الذكاء الاصطناعي في ملفاتك ويصيغ الأسئلة
        </p>
        <div className="w-12 h-12 mx-auto border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Running
  // ═══════════════════════════════════════════
  if (stage === 'running') {
    const answered = answers.filter(a => a !== -1).length;

    return (
      <div className="max-w-3xl mx-auto space-y-4" dir="rtl">

        {/* Header */}
        <div className="bg-surface-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-content text-sm">{subject}</div>
            {topic && <div className="text-xs text-content-muted mt-0.5">{topic}</div>}
          </div>
          <div className="text-xs text-content-muted tabular-nums">
            {answered} / {total} تمت الإجابة
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="bg-surface-card border border-border rounded-lg p-5"
            >
              <div className="font-semibold text-content text-sm mb-4 leading-relaxed">
                <span className="text-primary mr-1">{qi + 1}.</span> {q.q}
              </div>

              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  return (
                    <label
                      key={oi}
                      className={`
                        flex items-center gap-3 p-3 rounded-md cursor-pointer
                        border transition-all
                        ${selected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-surface-soft border-border hover:border-content-subtle'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={selected}
                        onChange={() => handleAnswer(qi, oi)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="text-sm text-content">
                        <strong className="text-content-muted">{String.fromCharCode(65 + oi)}.</strong> {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 sticky bottom-3 bg-surface py-3">
          <button
            onClick={handleReset}
            className="flex-1 bg-surface-card border border-border text-content-muted hover:text-content hover:border-content-subtle py-3 rounded-md font-semibold text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] bg-success hover:opacity-90 text-white py-3 rounded-md font-semibold text-sm transition-opacity"
          >
            ✅ إنهاء وعرض النتيجة
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════
  if (stage === 'results') {
    const colorClass = percentage >= 80 ? 'text-success'
      : percentage >= 60 ? 'text-warn'
      : 'text-danger';
    const bgClass = percentage >= 80 ? 'bg-success/10 border-success/30'
      : percentage >= 60 ? 'bg-warn/10 border-warn/30'
      : 'bg-danger/10 border-danger/30';
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '💪' : '📚';
    const message = percentage >= 80 ? 'ممتاز!' : percentage >= 60 ? 'جيد، تحتاج مراجعة' : 'يحتاج مراجعة شاملة';

    return (
      <div className="max-w-3xl mx-auto space-y-4" dir="rtl">

        {/* Score Card */}
        <div className={`border-2 rounded-lg p-8 text-center ${bgClass}`}>
          <div className="text-5xl mb-3">{emoji}</div>
          <div className={`text-4xl font-bold ${colorClass} mb-2 tabular-nums`}>
            {score} / {total}
          </div>
          <div className={`text-2xl font-bold ${colorClass} mb-1`}>
            {percentage}%
          </div>
          <div className="text-sm text-content-muted">
            {message}
          </div>
        </div>

        {/* Wrong answers */}
        <h3 className="text-sm font-bold text-content">
          📋 الأسئلة الخاطئة ({total - score})
        </h3>

        {total - score === 0 ? (
          <div className="bg-success/10 border border-success/30 rounded-lg p-8 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-semibold text-success">إجاباتك صحيحة بالكامل!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const userAns = answers[qi];
              const isCorrect = userAns === q.correct;
              if (isCorrect) return null;

              return (
                <div
                  key={qi}
                  className="bg-surface-card border-2 border-danger/30 rounded-lg p-5"
                >
                  <div className="font-semibold text-content text-sm mb-4 flex items-start gap-2">
                    <span className="text-danger flex-shrink-0">❌</span>
                    <span>سؤال {qi + 1}: {q.q}</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => {
                      const isCorrectOpt = oi === q.correct;
                      const isUserWrong = oi === userAns && !isCorrectOpt;

                      let cls = 'bg-surface-soft border-border text-content-muted';
                      if (isCorrectOpt) cls = 'bg-success/10 border-success/40 text-success';
                      else if (isUserWrong) cls = 'bg-danger/10 border-danger/40 text-danger';

                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 p-2.5 rounded-md border text-xs ${cls}`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                          <span className="flex-1">{opt}</span>
                          {isCorrectOpt && <span>✅</span>}
                          {isUserWrong && <span>❌</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs text-primary">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={async () => {
              try {
                await exportQuizPDF({
                  subject, topic, questions, answers, score, total, percentage, profile,
                });
              } catch (err) {
                alert('فشل التصدير: ' + err.message);
              }
            }}
            className="flex-1 bg-success hover:opacity-90 text-white py-3 rounded-md font-semibold text-sm transition-opacity"
          >
            📄 تصدير PDF
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-primary hover:bg-primary-light text-white py-3 rounded-md font-semibold text-sm transition-colors"
          >
            🎯 اختبار جديد
          </button>
        </div>

        {sourcesUsed === 'files' && (
          <div className="bg-success/10 border border-success/30 rounded-md p-3 text-center text-xs text-success font-semibold">
            📚 تم توليد الأسئلة من ملفاتك المرفوعة
          </div>
        )}
      </div>
    );
  }

  return null;
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-content-muted">
        {label}
      </label>
      {children}
    </div>
  );
}