import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  saveWeeklyReport,
  listWeeklyReports,
  deleteWeeklyReport,
  hasCurrentWeekReport,
  getCurrentWeekStart,
  computeAccuracy,
  formatWeek,
} from '../lib/weeklyCheckin';

const MOODS = [
  { value: 'ممتاز', emoji: '😄', color: 'text-success' },
  { value: 'جيد', emoji: '🙂', color: 'text-primary' },
  { value: 'متوسط', emoji: '😐', color: 'text-warn' },
  { value: 'سيء', emoji: '😔', color: 'text-danger' },
];

export default function WeeklyCheckin({ session, profile }) {
  const [stage, setStage] = useState('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [currentWeekDone, setCurrentWeekDone] = useState(false);
  const [form, setForm] = useState({
    hours_studied: '',
    questions_attempted: '',
    questions_correct: '',
    subjects_studied: [],
    mood: 'جيد',
    challenges: '',
    achievements: '',
  });

  const userId = session?.user?.id;

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, hasCurrent] = await Promise.all([
        listWeeklyReports(userId, 12),
        hasCurrentWeekReport(userId),
      ]);
      setReports(list);
      setCurrentWeekDone(hasCurrent);
    } catch (err) {
      console.error('فشل التحميل:', err);
    } finally {
      setLoading(false);
    }
  };

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleSubject = (s) => {
    setForm(prev => ({
      ...prev,
      subjects_studied: prev.subjects_studied.includes(s)
        ? prev.subjects_studied.filter(x => x !== s)
        : [...prev.subjects_studied, s],
    }));
  };

  const handleSubmit = async () => {
    if (!form.hours_studied && !form.questions_attempted) {
      return alert('الرجاء إدخال ساعات الدراسة أو عدد الأسئلة');
    }
    setSaving(true);
    try {
      await saveWeeklyReport(userId, {
        hours_studied: parseFloat(form.hours_studied) || 0,
        questions_attempted: parseInt(form.questions_attempted) || 0,
        questions_correct: parseInt(form.questions_correct) || 0,
        subjects_studied: form.subjects_studied,
        mood: form.mood,
        challenges: form.challenges.trim() || null,
        achievements: form.achievements.trim() || null,
      });
      setStage('list');
      setForm({
        hours_studied: '', questions_attempted: '', questions_correct: '',
        subjects_studied: [], mood: 'جيد', challenges: '', achievements: '',
      });
      loadData();
    } catch (err) {
      alert('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا التقرير؟')) return;
    try {
      await deleteWeeklyReport(id);
      loadData();
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  const getTrend = (index) => {
    if (index >= reports.length - 1) return null;
    const diff = computeAccuracy(reports[index]) - computeAccuracy(reports[index + 1]);
    if (Math.abs(diff) < 5) return { icon: '➖', color: 'text-content-muted', text: 'ثابت' };
    if (diff > 0) return { icon: '📈', color: 'text-success', text: `+${diff}%` };
    return { icon: '📉', color: 'text-danger', text: `${diff}%` };
  };

  if (stage === 'list') {
    return (
      <div className="max-w-3xl mx-auto space-y-5" dir="rtl">
        <div className="bg-surface-card border border-border rounded-lg p-6">
          <h1 className="text-2xl font-bold text-content mb-2">
            📊 التقرير الأسبوعي
          </h1>
          <p className="text-sm text-content-muted">
            سجّل تقدمك أسبوعيًا لترى صورة واضحة عن أدائك.
          </p>
        </div>

        {!currentWeekDone ? (
          <div className="bg-warn/10 border-2 border-warn/40 rounded-lg p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⏰</div>
              <div>
                <div className="text-sm font-bold text-warn">لم تُسجّل تقرير هذا الأسبوع</div>
                <div className="text-xs text-warn/80 mt-0.5">خصص دقيقتين لتقييم تقدمك</div>
              </div>
            </div>
            <button
              onClick={() => setStage('form')}
              className="bg-warn hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity"
            >
              📝 إضافة تقرير الآن
            </button>
          </div>
        ) : (
          <div className="bg-success/10 border-2 border-success/40 rounded-lg p-4 text-center text-sm font-bold text-success">
            ✅ أحسنت! سجّلت تقرير هذا الأسبوع
          </div>
        )}

        <h2 className="text-sm font-bold text-content">
          📅 سجل الأسابيع ({reports.length})
        </h2>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 mx-auto border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-surface-card border border-border rounded-lg p-12 text-center">
            <div className="text-5xl mb-3 opacity-40">📊</div>
            <div className="text-sm text-content-muted">لا توجد تقارير بعد.</div>
            <div className="text-xs text-content-subtle mt-1">ابدأ بتسجيل أسبوعك الأول.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, idx) => {
              const accuracy = computeAccuracy(r);
              const trend = getTrend(idx);
              const moodData = MOODS.find(m => m.value === r.mood) || MOODS[1];

              return (
                <div key={r.id} className="bg-surface-card border border-border rounded-lg p-5">
                  <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
                    <div>
                      <div className="text-sm font-bold text-content">
                        أسبوع {formatWeek(r.week_start)}
                      </div>
                      <div className={`text-xs mt-0.5 ${moodData.color}`}>
                        {moodData.emoji} {r.mood}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {trend && (
                        <div className={`text-xs font-bold ${trend.color}`}>
                          {trend.icon} {trend.text}
                        </div>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="w-8 h-8 rounded-md border border-danger/40 text-danger hover:bg-danger/10 transition-colors text-xs"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <MiniStat label="ساعات" value={r.hours_studied} color="text-primary" />
                    <MiniStat label="أسئلة" value={r.questions_attempted} color="text-warn" />
                    <MiniStat label="صحيحة" value={r.questions_correct} color="text-success" />
                    <MiniStat
                      label="الدقة"
                      value={`${accuracy}%`}
                      color={accuracy >= 70 ? 'text-success' : accuracy >= 50 ? 'text-warn' : 'text-danger'}
                    />
                  </div>

                  {r.subjects_studied?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {r.subjects_studied.map(s => (
                        <span key={s} className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.achievements && (
                    <div className="text-xs bg-success/10 border border-success/20 text-success rounded-md p-2.5 mb-2">
                      🏆 {r.achievements}
                    </div>
                  )}
                  {r.challenges && (
                    <div className="text-xs bg-warn/10 border border-warn/20 text-warn rounded-md p-2.5">
                      ⚠️ {r.challenges}
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

  const subjectOptions = profile?.target_subjects || [];

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-xl font-bold text-content">
          📝 تقرير أسبوع {formatWeek(getCurrentWeekStart())}
        </h1>
      </div>

      <div className="bg-surface-card border border-border rounded-lg p-6 space-y-5">

        <Field label="كم ساعة درست هذا الأسبوع؟">
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="مثال: 25"
            value={form.hours_studied}
            onChange={e => upd('hours_studied', e.target.value)}
            className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="عدد الأسئلة">
            <input
              type="number"
              min="0"
              placeholder="100"
              value={form.questions_attempted}
              onChange={e => upd('questions_attempted', e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </Field>
          <Field label="منها صحيحة">
            <input
              type="number"
              min="0"
              placeholder="70"
              value={form.questions_correct}
              onChange={e => upd('questions_correct', e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </Field>
        </div>

        {subjectOptions.length > 0 && (
          <Field label="المواد التي درستها">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {subjectOptions.map(s => {
                const active = form.subjects_studied.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`
                      p-2.5 rounded-md border text-xs font-semibold transition-all text-right
                      ${active
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-soft border-border text-content-muted hover:border-content-subtle'
                      }
                    `}
                  >
                    {active && '✓ '}{s}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="كيف كانت حالتك النفسية؟">
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(m => {
              const active = form.mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => upd('mood', m.value)}
                  className={`
                    p-3 rounded-md border text-center transition-all
                    ${active
                      ? 'bg-primary/10 border-primary'
                      : 'bg-surface-soft border-border hover:border-content-subtle'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className={`text-xs ${active ? 'text-primary font-semibold' : 'text-content-muted'}`}>
                    {m.value}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="ما أهم إنجاز هذا الأسبوع؟ (اختياري)">
          <textarea
            rows={2}
            placeholder="مثال: أنهيت فصل Cardiology كاملًا"
            value={form.achievements}
            onChange={e => upd('achievements', e.target.value)}
            className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-vertical"
          />
        </Field>

        <Field label="ما أكبر تحدي واجهته؟ (اختياري)">
          <textarea
            rows={2}
            placeholder="مثال: التشتت أثناء مراجعة الفارماكولوجي"
            value={form.challenges}
            onChange={e => upd('challenges', e.target.value)}
            className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-vertical"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setStage('list')}
            className="flex-1 bg-surface-soft border border-border text-content-muted hover:text-content py-3 rounded-md font-semibold text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] bg-success hover:opacity-90 text-white py-3 rounded-md font-semibold text-sm transition-opacity disabled:opacity-50"
          >
            {saving ? '...' : '💾 حفظ التقرير'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-content-muted">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-surface-soft rounded-md p-2.5 text-center">
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-content-subtle mt-0.5">{label}</div>
    </div>
  );
}