import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useMediaQuery';
import { saveManyWrongAnswers } from '../lib/wrongAnswers';
import { logActivity } from '../lib/streak';
import { exportExamPDF } from '../lib/pdfExport';

const SUBJECTS = [
  'الداخلية العصبية', 'الداخلية القلبية', 'الداخلية الهضمية', 'الداخلية الصدرية',
  'الجراحة العامة', 'الأطفال', 'النسائية والتوليد', 'الفارماكولوجي',
  'الباثولوجي', 'المايكروبيولوجي', 'الفيزيولوجي', 'التشريح',
];

const EXAM_PRESETS = [
  { label: 'قصير', sub: '30 سؤال - 45 د', numQuestions: 30, minutes: 45 },
  { label: 'متوسط', sub: '50 سؤال - 75 د', numQuestions: 50, minutes: 75 },
  { label: 'كامل', sub: '100 سؤال - 150 د', numQuestions: 100, minutes: 150 },
];

const BATCH_SIZE = 10;

export default function Exam({ profile, session, setActiveWork }) {
  const isMobile = useIsMobile();
  const [stage, setStage] = useState('setup');
  const [error, setError] = useState('');

  const [subject, setSubject] = useState(profile?.target_subjects?.[0] || SUBJECTS[0]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [useFiles, setUseFiles] = useState(true);
  const [professors, setProfessors] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [batches, setBatches] = useState([]);
  const timerRef = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (stage === 'running' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, timeLeft > 0]);

  useEffect(() => {
    const fetchProfs = async () => {
      if (!profile?.faculty_slug) return;
      const { data } = await supabase.from('professors').select('*, professor_styles(*)').eq('faculty_slug', profile.faculty_slug);
      if (data) setProfessors(data.filter(p => p.professor_styles && p.professor_styles.length > 0));
    };
    fetchProfs();
  }, [profile?.faculty_slug]);

  const generateBatch = async (count, exclude) => {
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
        topic: '',
        numQuestions: count,
        difficulty: 'متوسط',
        useFiles,
        excludeQuestions: exclude,
        professor: selectedProf ? { name: selectedProf.name, ...selectedProf.professor_styles[0] } : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error((data.error || `HTTP ${res.status}`) + (data.details ? ` - ${data.details}` : ''));
    if (!data.questions?.length) throw new Error('لم يتم توليد أسئلة');
    return data.questions;
  };

  const handleStart = async () => {
    setError('');
    setStage('loading');
    const preset = EXAM_PRESETS[presetIndex];
    const total = preset.numQuestions;

    const plan = [];
    let remaining = total;
    while (remaining > 0) {
      plan.push(Math.min(BATCH_SIZE, remaining));
      remaining -= BATCH_SIZE;
    }

    setTargetCount(total);
    setBatches(plan.map((size, i) => ({
      size,
      status: i === 0 ? 'loading' : 'pending',
    })));

    try {
      const first = await generateBatch(plan[0], []);

      setQuestions(first);
      setAnswers(new Array(first.length).fill(-1));
      setFlagged(new Array(first.length).fill(false));
      setCurrentQ(0);
      setTimeLeft(preset.minutes * 60);
      setTotalTime(preset.minutes * 60);
      setBatches(prev => prev.map((b, i) => i === 0 ? { ...b, status: 'ready' } : b));
      setStage('running');
      if (setActiveWork) setActiveWork({ type: 'محاكاة امتحان' });

      let allQuestions = [...first];

      for (let i = 1; i < plan.length; i++) {
        setBatches(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'loading' } : b));

        try {
          const exclude = allQuestions.map(q => q.q);
          const batch = await generateBatch(plan[i], exclude);

          allQuestions = [...allQuestions, ...batch];

          setQuestions(allQuestions);
          setAnswers(prev => [...prev, ...new Array(batch.length).fill(-1)]);
          setFlagged(prev => [...prev, ...new Array(batch.length).fill(false)]);
          setBatches(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'ready' } : b));
        } catch (err) {
          console.error(`فشل الدفعة ${i + 1}:`, err);
          setBatches(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'error' } : b));
        }
      }
    } catch (err) {
      setError(err.message);
      setStage('setup');
    }
  };

  const handleAnswer = (optIdx) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[currentQ] = optIdx;
      return copy;
    });
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const copy = [...prev];
      copy[currentQ] = !copy[currentQ];
      return copy;
    });
  };

  const goTo = (i) => setCurrentQ(i);
  const next = () => setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
  const prev = () => setCurrentQ(prev => Math.max(prev - 1, 0));

  const handlePause = () => {
    clearInterval(timerRef.current);
    setStage('paused');
  };
  const handleResume = () => setStage('running');

  const handleSubmit = async () => {
    if (batches.some(b => b.status === 'loading' || b.status === 'pending')) {
      if (!confirm('بعض الأسئلة لا تزال قيد التوليد. هل تريد التسليم بالإجابات الحالية؟')) return;
    }

    const unanswered = answers.filter(a => a === -1).length;
    if (unanswered > 0) {
      if (!confirm(`لديك ${unanswered} سؤال غير مُجاب. تسليم الامتحان؟`)) return;
    }
    await finishExam();
  };

  const handleAutoSubmit = async () => {
    alert('⏰ انتهى الوقت! سيتم تسليم الامتحان تلقائيًا.');
    await finishExam();
  };

  const finishExam = async () => {
    clearInterval(timerRef.current);

    const score = questions.reduce((acc, q, i) =>
      acc + (answers[i] === q.correct ? 1 : 0), 0
    );
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const timeUsed = totalTime - timeLeft;

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
          await saveManyWrongAnswers(freshSession.user.id, wrongOnes, subject, 'محاكاة امتحان');
        }
      }
    } catch (err) {
      console.error('فشل حفظ الأخطاء:', err);
    }

    setResult({ score, total, percentage, timeUsed });
    setStage('results');
    if (setActiveWork) setActiveWork(null);

    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.id) await logActivity(s.user.id, 'exam');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    if (setActiveWork) setActiveWork(null);
    setStage('setup');
    setQuestions([]);
    setAnswers([]);
    setFlagged([]);
    setCurrentQ(0);
    setResult(null);
    setError('');
    setBatches([]);
    setTargetCount(0);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════
  if (stage === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
        <div className="bg-surface-card border border-border rounded-lg p-6">
          <h1 className="text-2xl font-bold text-content mb-2">
            ⏱️ محاكاة الامتحان الحقيقي
          </h1>
          <p className="text-sm text-content-muted">
            امتحان كامل بمؤقت — الأسئلة تُولّد على دفعات لتوفير وقت الانتظار.
          </p>
        </div>

        <div className="bg-surface-card border border-border rounded-lg p-6 space-y-5">
          <Field label="المادة">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="حجم الامتحان">
            <div className="space-y-2">
              {EXAM_PRESETS.map((p, i) => {
                const active = presetIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPresetIndex(i)}
                    className={`
                      w-full text-right p-4 rounded-md border transition-all
                      ${active
                        ? 'bg-primary/10 border-primary'
                        : 'bg-surface-soft border-border hover:border-content-subtle'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-semibold text-sm ${active ? 'text-primary' : 'text-content'}`}>
                          {p.label}
                        </div>
                        <div className="text-xs text-content-muted mt-0.5">
                          {p.sub}
                        </div>
                      </div>
                      <div className={`text-xs ${active ? 'text-primary' : 'text-content-subtle'}`}>
                        {Math.ceil(p.numQuestions / BATCH_SIZE)} دفعات
                      </div>
                    </div>
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
                <option value="">بدون شخصية (امتحان عام)</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>د. {p.name} - {p.subject}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="المصدر">
            <label className="flex items-center gap-3 p-3 bg-surface-soft border border-border rounded-md cursor-pointer hover:border-content-subtle transition-colors">
              <input
                type="checkbox"
                checked={useFiles}
                onChange={e => setUseFiles(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-sm text-content">
                استخدم ملفاتي المرفوعة كمصدر أساسي
              </span>
            </label>
          </Field>

          <div className="bg-primary/5 border border-primary/20 rounded-md p-4 text-xs text-content-muted">
            <div className="font-semibold text-content mb-2">💡 طريقة العمل</div>
            <ul className="space-y-1 list-disc pr-5">
              <li>الدفعة الأولى (10 أسئلة) جاهزة خلال ~15 ثانية</li>
              <li>ابدأ الإجابة فورًا بينما تُولّد البقية في الخلفية</li>
              <li>الأسئلة الجديدة تُضاف تلقائيًا</li>
            </ul>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-md p-3 text-sm text-danger">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleStart}
            className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-md transition-colors shadow-sm"
          >
            🚀 بدء الامتحان
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
          جاري تحضير الدفعة الأولى...
        </h2>
        <p className="text-sm text-content-muted mb-8">
          يتم توليد {BATCH_SIZE} أسئلة — ستبدأ خلال ثوانٍ
        </p>
        <div className="w-12 h-12 mx-auto border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Paused
  // ═══════════════════════════════════════════
  if (stage === 'paused') {
    return (
      <div className="max-w-md mx-auto text-center py-16" dir="rtl">
        <div className="text-6xl mb-6">⏸️</div>
        <h2 className="text-xl font-bold text-content mb-2">الامتحان متوقف</h2>
        <p className="text-sm text-content-muted mb-8">
          الوقت المتبقي: <span className="font-mono font-bold text-content">{formatTime(timeLeft)}</span>
        </p>
        <button
          onClick={handleResume}
          className="bg-primary hover:bg-primary-light text-white font-semibold px-8 py-3 rounded-md transition-colors"
        >
          ▶️ استئناف
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Running
  // ═══════════════════════════════════════════
  if (stage === 'running') {
    const q = questions[currentQ];
    const answered = answers.filter(a => a !== -1).length;
    const timePercent = (timeLeft / totalTime) * 100;
    const timeColorClass = timePercent < 20 ? 'text-danger bg-danger/10'
      : timePercent < 50 ? 'text-warn bg-warn/10'
      : 'text-success bg-success/10';

    const allReady = batches.every(b => b.status === 'ready' || b.status === 'error');
    const loadingBatch = batches.find(b => b.status === 'loading');
    const loadingBatchIdx = batches.findIndex(b => b.status === 'loading');
    const isLastQuestion = currentQ === questions.length - 1;
    const waitingForMore = isLastQuestion && !allReady;

    return (
      <div className="max-w-6xl mx-auto space-y-4" dir="rtl">

        {/* Top Bar */}
        <div className="bg-surface-card border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`font-mono text-xl font-bold px-4 py-2 rounded-md tabular-nums ${timeColorClass}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <button
              onClick={handlePause}
              className="text-xs bg-surface-soft border border-border text-content-muted hover:text-content px-3 py-2 rounded-md transition-colors"
            >
              ⏸️ إيقاف
            </button>
          </div>

          <div className="text-xs text-content-muted">
            تمت الإجابة: <strong className="text-primary tabular-nums">{answered}/{questions.length}</strong>
            <span className="mr-2 text-content-subtle">(الهدف: {targetCount})</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timePercent < 20 ? 'bg-danger' : timePercent < 50 ? 'bg-warn' : 'bg-success'
            }`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        {/* Loading Batch Info */}
        {!allReady && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-center gap-3 text-xs text-content-muted">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            <span>
              📦 جاري توليد الدفعة {loadingBatchIdx + 1} من {batches.length}
              {loadingBatch && ` (${loadingBatch.size} أسئلة)`}
              {' — '}يمكنك متابعة الإجابة الآن
            </span>
          </div>
        )}

        {/* Main Grid */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-[2fr_1fr]'}`}>

          {/* Question Panel */}
          <div className="bg-surface-card border border-border rounded-lg p-6">

            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="text-sm font-bold text-primary">
                السؤال {currentQ + 1} من {questions.length}
                {!allReady && <span className="text-xs font-normal text-content-subtle mr-2">(الهدف: {targetCount})</span>}
              </div>
              <button
                onClick={toggleFlag}
                className={`
                  text-xs px-3 py-1.5 rounded-md border transition-all
                  ${flagged[currentQ]
                    ? 'bg-warn/10 border-warn/40 text-warn'
                    : 'bg-surface-soft border-border text-content-muted hover:text-content'
                  }
                `}
              >
                {flagged[currentQ] ? '🚩 مُعلّم' : '🚩 علّم'}
              </button>
            </div>

            <div className="text-content text-base leading-relaxed mb-6">
              {q.q}
            </div>

            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = answers[currentQ] === oi;
                return (
                  <label
                    key={oi}
                    className={`
                      flex items-center gap-3 p-4 rounded-md cursor-pointer border transition-all
                      ${selected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-surface-soft border-border hover:border-content-subtle'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={`exam-q-${currentQ}`}
                      checked={selected}
                      onChange={() => handleAnswer(oi)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-content">
                      <strong className="text-content-muted">{String.fromCharCode(65 + oi)}.</strong> {opt}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-2 mt-6">
              <button
                onClick={prev}
                disabled={currentQ === 0}
                className="px-5 py-2.5 rounded-md border border-border bg-surface-soft text-content text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-content-subtle transition-colors"
              >
                ← السابق
              </button>

              {waitingForMore ? (
                <button
                  disabled
                  className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-dashed border-primary bg-primary/5 text-primary text-sm font-semibold cursor-wait"
                >
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  جاري التحميل...
                </button>
              ) : isLastQuestion ? (
                <button
                  onClick={handleSubmit}
                  className="bg-success hover:opacity-90 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-opacity"
                >
                  ✅ إنهاء وتسليم
                </button>
              ) : (
                <button
                  onClick={next}
                  className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-colors"
                >
                  التالي →
                </button>
              )}
            </div>
          </div>

          {/* Question Map */}
          <div className={`bg-surface-card border border-border rounded-lg p-4 ${isMobile ? '' : 'self-start sticky top-4'}`}>
            <div className="text-xs font-bold text-content mb-3">
              🗺️ خريطة الأسئلة ({questions.length}/{targetCount})
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== -1;
                const isFlag = flagged[i];
                const isCurrent = i === currentQ;

                let cls = 'bg-surface-soft border-border text-content-subtle';
                if (isAnswered) cls = 'bg-primary/10 border-primary text-primary';
                if (isFlag) cls = 'bg-warn/10 border-warn text-warn';
                if (isCurrent) cls = 'bg-primary text-white border-primary font-bold';

                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`aspect-square rounded-md border text-xs font-semibold flex items-center justify-center transition-all ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}

              {!allReady && Array.from({ length: targetCount - questions.length }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className="aspect-square rounded-md border border-dashed border-border bg-surface-soft text-content-subtle text-xs flex items-center justify-center"
                >
                  ⏳
                </div>
              ))}
            </div>

            <div className="text-xs space-y-1.5 text-content-muted mb-4">
              <div className="flex justify-between">
                <span>🟣 مجاب:</span>
                <span className="font-mono">{answered}</span>
              </div>
              <div className="flex justify-between">
                <span>🚩 مُعلّم:</span>
                <span className="font-mono">{flagged.filter(f => f).length}</span>
              </div>
              <div className="flex justify-between">
                <span>⚪ متروك:</span>
                <span className="font-mono">{questions.length - answered}</span>
              </div>
              {!allReady && (
                <div className="flex justify-between text-primary">
                  <span>⏳ قيد التوليد:</span>
                  <span className="font-mono">{targetCount - questions.length}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-success hover:opacity-90 text-white py-2.5 rounded-md text-sm font-semibold transition-opacity"
            >
              ✅ تسليم الامتحان
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════
  if (stage === 'results' && result) {
    const { score, total, percentage, timeUsed } = result;
    const colorClass = percentage >= 80 ? 'text-success'
      : percentage >= 60 ? 'text-warn'
      : 'text-danger';
    const bgClass = percentage >= 80 ? 'bg-success/10 border-success/30'
      : percentage >= 60 ? 'bg-warn/10 border-warn/30'
      : 'bg-danger/10 border-danger/30';
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '💪' : '📚';
    const message = percentage >= 80 ? 'مستوى ممتاز!'
      : percentage >= 60 ? 'جيد، يحتاج مراجعة'
      : 'يحتاج دراسة مكثفة';

    const timeUsedMin = Math.floor(timeUsed / 60);
    const avgPerQ = total > 0 ? Math.round(timeUsed / total) : 0;

    return (
      <div className="max-w-3xl mx-auto space-y-4" dir="rtl">

        <div className={`border-2 rounded-lg p-10 text-center ${bgClass}`}>
          <div className="text-5xl mb-4">{emoji}</div>
          <div className={`text-4xl font-bold ${colorClass} mb-3 tabular-nums`}>
            {score} / {total}
          </div>
          <div className={`text-2xl font-bold ${colorClass} mb-2`}>{percentage}%</div>
          <div className="text-sm text-content-muted mb-6">{message}</div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
            <div>
              <div className="text-xs text-content-subtle mb-1">الوقت المستغرق</div>
              <div className="text-xl font-bold text-content">{timeUsedMin} د</div>
            </div>
            <div>
              <div className="text-xs text-content-subtle mb-1">متوسط/سؤال</div>
              <div className="text-xl font-bold text-content">{avgPerQ} ث</div>
            </div>
          </div>
        </div>

        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center text-sm font-semibold text-success">
          💾 تم حفظ {total - score} سؤال خاطئ تلقائيًا في بنك الأخطاء
        </div>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                await exportExamPDF({
                  subject, questions, answers, score, total,
                  percentage, timeUsed, totalTime, profile,
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
            🔄 امتحان جديد
          </button>
        </div>
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