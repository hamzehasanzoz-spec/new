import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useMediaQuery';
import { saveManyWrongAnswers } from '../lib/wrongAnswers';
import { exportExamPDF } from '../lib/pdfExport';
const SUBJECTS = [
  'الداخلية العصبية', 'الداخلية القلبية', 'الداخلية الهضمية', 'الداخلية الصدرية',
  'الجراحة العامة', 'الأطفال', 'النسائية والتوليد', 'الفارماكولوجي',
  'الباثولوجي', 'المايكروبيولوجي', 'الفيزيولوجي', 'التشريح',
];
import { logActivity } from '../lib/streak';

const EXAM_PRESETS = [
  { label: 'قصير (30 سؤال - 45 د)', numQuestions: 30, minutes: 45 },
  { label: 'متوسط (50 سؤال - 75 د)', numQuestions: 50, minutes: 75 },
  { label: 'كامل (100 سؤال - 150 د)', numQuestions: 100, minutes: 150 },
];

const BATCH_SIZE = 10;

export default function Exam({ profile, session, setActiveWork }) {
  const isMobile = useIsMobile();
  const [stage, setStage] = useState('setup');
  const [error, setError] = useState('');

  const [subject, setSubject] = useState(profile?.target_subjects?.[0] || SUBJECTS[0]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [useFiles, setUseFiles] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [batches, setBatches] = useState([]); // [{ size, status }]
  const timerRef = useRef(null);
  const [result, setResult] = useState(null);

  // ═══ Timer ═══
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

  // ═══ توليد دفعة واحدة ═══
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
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (!data.questions?.length) throw new Error('لم يتم توليد أسئلة');
    return data.questions;
  };

  // ═══ بدء الامتحان — دفعات ═══
  const handleStart = async () => {
    setError('');
    setStage('loading');
    const preset = EXAM_PRESETS[presetIndex];
    const total = preset.numQuestions;

    // خطة الدفعات: [10, 10, 10, ... باقي]
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
      // ═══ الدفعة الأولى ═══
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

      // ═══ باقي الدفعات في الخلفية ═══
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
          // نكمل الدفعات التالية رغم الفشل
        }
      }
    } catch (err) {
      setError(err.message);
      setStage('setup');
    }
  };

  // ═══ الإجابة ═══
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

  // ═══ التنقل ═══
  const goTo = (i) => setCurrentQ(i);
  const next = () => setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
  const prev = () => setCurrentQ(prev => Math.max(prev - 1, 0));

  // هل الدفعة التالية جاهزة؟
  const isNextBatchLoading = () => {
    if (currentQ !== questions.length - 1) return false;
    // هل هناك دفعات لم تُكتمل بعد؟
    return batches.some(b => b.status === 'loading' || b.status === 'pending');
  };

  const handlePause = () => {
    clearInterval(timerRef.current);
    setStage('paused');
  };
  const handleResume = () => setStage('running');

  // ═══ الإرسال ═══
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
          await saveManyWrongAnswers(
            freshSession.user.id,
            wrongOnes,
            subject,
            'محاكاة امتحان'
          );
        }
      }
    } catch (err) {
      console.error('فشل حفظ الأخطاء:', err);
    }

        setResult({ score, total, percentage, timeUsed });
    setStage('results');
    if (setActiveWork) setActiveWork(null);
     // 🔥 سجّل النشاط
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

  // ═══════════════════════════════════════════════
  // STAGE: Setup
  // ═══════════════════════════════════════════════
  if (stage === 'setup') {
    return (
      <div style={{ maxWidth: 700, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
          color: '#fff', padding: 30, borderRadius: 16, marginBottom: 25,
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5em' }}>⏱️ محاكاة الامتحان الحقيقي</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
            امتحان كامل بمؤقت — الأسئلة تُولّد على دفعات لتوفير وقت الانتظار.
          </p>
        </div>

        <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 14, border: '1px solid var(--border)' }}>
          <Field label="المادة">
            <select value={subject} onChange={e => setSubject(e.target.value)} style={selectStyle}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="حجم الامتحان">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAM_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPresetIndex(i)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 10,
                    border: presetIndex === i ? '2px solid #7C3AED' : '1px solid var(--border)',
                    background: presetIndex === i ? '#F5F3FF' : '#F8FAFC',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontSize: '0.95em',
                    fontWeight: presetIndex === i ? 'bold' : 'normal',
                  }}
                >
                  {p.label}
                  <span style={{ fontSize: '0.75em', opacity: 0.7, marginRight: 8 }}>
                    ({Math.ceil(p.numQuestions / BATCH_SIZE)} دفعات)
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="المصدر">
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, background: 'var(--bg)', borderRadius: 8, cursor: 'pointer',
            }}>
              <input type="checkbox" checked={useFiles} onChange={e => setUseFiles(e.target.checked)} />
              <span style={{ fontSize: '0.9em' }}>استخدم ملفاتي المرفوعة كمصدر أساسي</span>
            </label>
          </Field>

          <div style={{
            background: '#F5F3FF',
            border: '1px solid #A78BFA',
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
            fontSize: '0.85em',
            color: '#5B21B6',
          }}>
            💡 <strong>طريقة العمل:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingRight: 20 }}>
              <li>الدفعة الأولى (10 أسئلة) جاهزة في ~15 ثانية</li>
              <li>ابدأ الإجابة فورًا بينما تُولّد البقية في الخلفية</li>
              <li>الأسئلة الجديدة تُضاف تلقائيًا</li>
            </ul>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#991B1B', borderRadius: 8, fontSize: '0.88em', marginBottom: 16,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: 14, background: '#7C3AED', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            🚀 بدء الامتحان
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Loading (الدفعة الأولى)
  // ═══════════════════════════════════════════════
  if (stage === 'loading') {
    return (
      <div style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 25, direction: 'rtl' }}>
        <div style={{ fontSize: '3em', marginBottom: 20 }}>🧠</div>
        <h2 style={{ color: '#7C3AED' }}>جاري تحضير الدفعة الأولى...</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          يتم توليد {BATCH_SIZE} أسئلة — ستبدأ خلال ثوانٍ
        </p>
        <div style={{
          width: 50, height: 50, margin: '20px auto',
          border: '4px solid #E2E8F0', borderTop: '4px solid #7C3AED',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Paused
  // ═══════════════════════════════════════════════
  if (stage === 'paused') {
    return (
      <div style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 25, direction: 'rtl' }}>
        <div style={{ fontSize: '4em', marginBottom: 20 }}>⏸️</div>
        <h2 style={{ color: '#7C3AED' }}>الامتحان متوقف</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
          الوقت المتبقي: <strong>{formatTime(timeLeft)}</strong>
        </p>
        <button
          onClick={handleResume}
          style={{
            padding: '14px 40px', background: '#7C3AED', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          ▶️ استئناف
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Running
  // ═══════════════════════════════════════════════
  if (stage === 'running') {
    const q = questions[currentQ];
    const answered = answers.filter(a => a !== -1).length;
    const timePercent = (timeLeft / totalTime) * 100;
    const timeColor = timePercent < 20 ? '#EF4444' : timePercent < 50 ? '#F59E0B' : '#10B981';

    const allReady = batches.every(b => b.status === 'ready' || b.status === 'error');
    const loadingBatch = batches.find(b => b.status === 'loading');
    const loadingBatchIdx = batches.findIndex(b => b.status === 'loading');
    const isLastQuestion = currentQ === questions.length - 1;
    const waitingForMore = isLastQuestion && !allReady;

    return (
      <div style={{ maxWidth: 1100, margin: '20px auto', padding: 20, direction: 'rtl' }}>
        {/* الشريط العلوي */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14,
          padding: isMobile ? 12 : 16, marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              fontSize: '1.6em', fontWeight: 'bold', color: timeColor,
              padding: '8px 16px', background: `${timeColor}15`,
              borderRadius: 10, fontFamily: 'monospace',
            }}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <button
              onClick={handlePause}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85em',
              }}
            >
              ⏸️ إيقاف
            </button>
          </div>

          <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
            تمت الإجابة: <strong style={{ color: '#7C3AED' }}>{answered}/{questions.length}</strong>
            <span style={{ marginRight: 12, fontSize: '0.9em' }}>
              (الهدف: {targetCount})
            </span>
          </div>
        </div>

        {/* شريط التحميل */}
        {!allReady && (
          <div style={{
            background: '#F5F3FF', border: '1px solid #A78BFA', borderRadius: 10,
            padding: '10px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '0.85em', color: '#5B21B6',
          }}>
            <div style={{
              width: 16, height: 16, border: '2px solid #A78BFA',
              borderTop: '2px solid #7C3AED', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>
              📦 جاري توليد الدفعة {loadingBatchIdx + 1} من {batches.length}
              {loadingBatch && ` (${loadingBatch.size} أسئلة)`}
              {' — '}يمكنك متابعة الإجابة الآن
            </span>
          </div>
        )}

        {/* شريط الوقت */}
        <div style={{
          height: 6, background: 'var(--bg-subtle)', borderRadius: 99,
          marginBottom: 20, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${timePercent}%`,
            background: timeColor, transition: 'width 1s linear',
          }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: 20,
        }}>
          {/* السؤال */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 16, gap: 10,
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95em', color: '#7C3AED' }}>
                السؤال {currentQ + 1} من {questions.length}
                {!allReady && <span style={{ fontSize: '0.75em', opacity: 0.7, marginRight: 8 }}>(الهدف: {targetCount})</span>}
              </div>
              <button
                onClick={toggleFlag}
                style={{
                  background: flagged[currentQ] ? '#FEF3C7' : 'transparent',
                  border: flagged[currentQ] ? '1px solid #F59E0B' : '1px solid var(--border)',
                  color: flagged[currentQ] ? '#92400E' : '#64748B',
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8em',
                }}
              >
                {flagged[currentQ] ? '🚩 مُعلّم' : '🚩 علّم'}
              </button>
            </div>

            <div style={{ fontSize: '1em', lineHeight: 1.7, marginBottom: 20, color: 'var(--text)' }}>
              {q.q}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[currentQ] === oi;
                return (
                  <label
                    key={oi}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 10,
                      border: selected ? '2px solid #7C3AED' : '1px solid var(--border)',
                      background: selected ? '#F5F3FF' : '#F8FAFC',
                      cursor: 'pointer', fontSize: '0.93em',
                    }}
                  >
                    <input
                      type="radio"
                      name={`exam-q-${currentQ}`}
                      checked={selected}
                      onChange={() => handleAnswer(oi)}
                    />
                    <span><strong>{String.fromCharCode(65 + oi)}.</strong> {opt}</span>
                  </label>
                );
              })}
            </div>

            {/* التنقل */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
              <button
                onClick={prev}
                disabled={currentQ === 0}
                style={{
                  padding: '12px 24px',
                  background: currentQ === 0 ? '#F1F5F9' : '#fff',
                  color: currentQ === 0 ? '#CBD5E1' : '#1E293B',
                  border: '1px solid var(--border)', borderRadius: 8,
                  cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold',
                }}
              >
                ← السابق
              </button>

              {waitingForMore ? (
                <button
                  disabled
                  style={{
                    padding: '12px 24px', background: 'var(--bg-subtle)',
                    color: '#7C3AED', border: '1px dashed #7C3AED',
                    borderRadius: 8, fontWeight: 'bold',
                    cursor: 'wait', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <div style={{
                    width: 14, height: 14, border: '2px solid #A78BFA',
                    borderTop: '2px solid #7C3AED', borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  جاري التحميل...
                </button>
              ) : isLastQuestion ? (
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: '12px 24px', background: '#10B981', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  ✅ إنهاء وتسليم
                </button>
              ) : (
                <button
                  onClick={next}
                  style={{
                    padding: '12px 24px', background: '#7C3AED', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  التالي →
                </button>
              )}
            </div>
          </div>

          {/* خريطة الأسئلة */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 16,
            alignSelf: 'flex-start',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : 20,
          }}>
            <div style={{
              fontSize: '0.85em', fontWeight: 'bold',
              	color: 'var(--primary)', marginBottom: 12,
            }}>
              🗺️ خريطة الأسئلة ({questions.length}/{targetCount})
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6, marginBottom: 16,
            }}>
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== -1;
                const isFlag = flagged[i];
                const isCurrent = i === currentQ;

                let bg = '#F8FAFC';
                let color = '#94A3B8';
                let border = '1px solid var(--border)';

                if (isAnswered) {
                  bg = '#F5F3FF'; color = '#7C3AED'; border = '1px solid #7C3AED';
                }
                if (isCurrent) {
                  border = '2px solid #2A5C82'; bg = '#EFF6FF'; color = '#2A5C82';
                }
                if (isFlag) {
                  bg = '#FEF3C7'; color = '#92400E'; border = '1px solid #F59E0B';
                }

                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    style={{
                      aspectRatio: '1', background: bg, color, border,
                      borderRadius: 6, cursor: 'pointer',
                      fontSize: '0.78em', fontWeight: 'bold', padding: 0,
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}

              {/* مربعات فارغة للمتبقي */}
              {!allReady && Array.from({ length: targetCount - questions.length }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  style={{
                    aspectRatio: '1',
                    background: 'var(--bg)',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7em',
                    color: '#CBD5E1',
                  }}
                >
                  ⏳
                </div>
              ))}
            </div>

            <div style={{
              fontSize: '0.75em', color: 'var(--text-muted)',
              marginBottom: 16, lineHeight: 1.8,
            }}>
              <div>🟣 مجاب: {answered}</div>
              <div>🚩 مُعلّم: {flagged.filter(f => f).length}</div>
              <div>⚪ متروك: {questions.length - answered}</div>
              {!allReady && (
                <div style={{ color: '#7C3AED' }}>
                  ⏳ قيد التوليد: {targetCount - questions.length}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              style={{
                width: '100%', padding: 12, background: '#10B981', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 'bold',
                cursor: 'pointer', fontSize: '0.9em',
              }}
            >
              ✅ تسليم الامتحان
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STAGE: Results
  // ═══════════════════════════════════════════════
  if (stage === 'results' && result) {
    const { score, total, percentage, timeUsed } = result;
    const color = percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444';
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '💪' : '📚';
    const message = percentage >= 80 ? 'مستوى ممتاز!'
      : percentage >= 60 ? 'جيد، يحتاج مراجعة'
      : 'يحتاج دراسة مكثفة';

    const timeUsedMin = Math.floor(timeUsed / 60);
    const avgPerQ = total > 0 ? Math.round(timeUsed / total) : 0;

    return (
      <div style={{ maxWidth: 900, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        <div style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          color: '#fff', padding: 40, borderRadius: 20,
          textAlign: 'center', marginBottom: 30,
        }}>
          <div style={{ fontSize: '3em', marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: 8 }}>
            {score} / {total}
          </div>
          <div style={{ fontSize: '1.4em', marginBottom: 6 }}>{percentage}%</div>
          <div style={{ opacity: 0.9, marginBottom: 16 }}>{message}</div>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            flexWrap: 'wrap', paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div>
              <div style={{ fontSize: '0.8em', opacity: 0.8 }}>الوقت المستغرق</div>
              <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{timeUsedMin} د</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8em', opacity: 0.8 }}>متوسط/سؤال</div>
              <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{avgPerQ} ث</div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#F0FDF4', border: '2px solid #10B981',
          borderRadius: 12, padding: 16, marginBottom: 20,
          textAlign: 'center', color: '#065F46', fontWeight: 'bold',
        }}>
          💾 تم حفظ {total - score} سؤال خاطئ تلقائيًا في بنك الأخطاء
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => {
              try {
                await exportExamPDF({
                  subject,
                  questions,
                  answers,
                  score,
                  total,
                  percentage,
                  timeUsed,
                  totalTime,
                  profile,
                });
              } catch (err) {
                alert('فشل التصدير: ' + err.message);
              }
            }}
            style={{
              flex: 1, padding: 14, background: '#10B981', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            📄 تصدير PDF
          </button>
          <button
            onClick={handleReset}
            style={{
              flex: 1, padding: 14, background: '#7C3AED', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
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
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block', fontWeight: 'bold',
        marginBottom: 8, color: 'var(--text)', fontSize: '0.92em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectStyle = {
  width: '100%', padding: 12, borderRadius: 8,
  border: '1px solid #CBD5E1', fontSize: '0.95em',
  fontFamily: 'inherit', background: 'var(--bg-elevated)',
  cursor: 'pointer', boxSizing: 'border-box',
  
};