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
  { value: 'ممتاز', emoji: '😄', color: '#10B981' },
  { value: 'جيد', emoji: '🙂', color: '#2A5C82' },
  { value: 'متوسط', emoji: '😐', color: '#F59E0B' },
  { value: 'سيء', emoji: '😔', color: '#EF4444' },
];

export default function WeeklyCheckin({ session, profile }) {
  const [stage, setStage] = useState('list'); // list | form
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

  useEffect(() => {
    loadData();
  }, [userId]);

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

  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

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
      alert('الرجاء إدخال ساعات الدراسة أو عدد الأسئلة');
      return;
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
      alert('✅ تم حفظ التقرير');
      setStage('list');
      setForm({
        hours_studied: '',
        questions_attempted: '',
        questions_correct: '',
        subjects_studied: [],
        mood: 'جيد',
        challenges: '',
        achievements: '',
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

  // حساب الاتجاه
  const getTrend = (index) => {
    if (index >= reports.length - 1) return null;
    const current = computeAccuracy(reports[index]);
    const previous = computeAccuracy(reports[index + 1]);
    const diff = current - previous;
    if (Math.abs(diff) < 5) return { icon: '➖', color: '#94A3B8', text: 'ثابت' };
    if (diff > 0) return { icon: '📈', color: '#10B981', text: `+${diff}%` };
    return { icon: '📉', color: '#EF4444', text: `${diff}%` };
  };

  // ══════════════════════════════════════
  // Stage: List
  // ══════════════════════════════════════
  if (stage === 'list') {
    return (
      <div style={{ maxWidth: 900, margin: '30px auto', padding: 25, direction: 'rtl' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
          color: '#fff',
          padding: 30,
          borderRadius: 16,
          marginBottom: 24,
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5em' }}>📊 التقرير الأسبوعي</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
            سجّل تقدمك أسبوعيًا لترى صورة واضحة عن أدائك.
          </p>
        </div>

        {/* Banner الحالة */}
        {!currentWeekDone ? (
          <div style={{
            background: '#FEF3C7',
            border: '2px solid #F59E0B',
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '2em' }}>⏰</div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#92400E' }}>
                  لم تُسجّل تقرير هذا الأسبوع بعد
                </div>
                <div style={{ fontSize: '0.85em', color: '#92400E', opacity: 0.8 }}>
                  خصص دقيقتين لتقييم تقدمك
                </div>
              </div>
            </div>
            <button
              onClick={() => setStage('form')}
              style={{
                background: '#F59E0B',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em',
              }}
            >
              📝 إضافة تقرير الآن
            </button>
          </div>
        ) : (
          <div style={{
            background: '#F0FDF4',
            border: '2px solid #10B981',
            borderRadius: 14,
            padding: 16,
            marginBottom: 24,
            textAlign: 'center',
            color: '#065F46',
            fontWeight: 'bold',
          }}>
            ✅ أحسنت! سجّلت تقرير هذا الأسبوع
          </div>
        )}

        {/* السجل */}
        <h2 style={{ color: '#2A5C82', fontSize: '1.1em', marginBottom: 16 }}>
          📅 سجل الأسابيع ({reports.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#64748B' }}>
            جاري التحميل...
          </div>
        ) : reports.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 50,
            textAlign: 'center',
            color: '#94A3B8',
          }}>
            <div style={{ fontSize: '3em', marginBottom: 12 }}>📊</div>
            <div>لا توجد تقارير بعد.</div>
            <div style={{ fontSize: '0.85em', marginTop: 8 }}>
              ابدأ بتسجيل أسبوعك الأول.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map((r, idx) => {
              const accuracy = computeAccuracy(r);
              const trend = getTrend(idx);
              const moodData = MOODS.find(m => m.value === r.mood) || MOODS[1];

              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1E293B', fontSize: '0.95em' }}>
                        أسبوع {formatWeek(r.week_start)}
                      </div>
                      <div style={{ fontSize: '0.78em', color: '#94A3B8', marginTop: 2 }}>
                        {moodData.emoji} {r.mood}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {trend && (
                        <div style={{
                          fontSize: '0.82em',
                          color: trend.color,
                          fontWeight: 'bold',
                        }}>
                          {trend.icon} {trend.text}
                        </div>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #EF4444',
                          color: '#EF4444',
                          padding: '4px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.75em',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                    <MiniStat label="ساعات" value={r.hours_studied} color="#2A5C82" />
                    <MiniStat label="أسئلة" value={r.questions_attempted} color="#8B5CF6" />
                    <MiniStat
                      label="صحيحة"
                      value={r.questions_correct}
                      color="#10B981"
                    />
                    <MiniStat
                      label="الدقة"
                      value={`${accuracy}%`}
                      color={accuracy >= 70 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : '#EF4444'}
                    />
                  </div>

                  {r.subjects_studied?.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 10,
                    }}>
                      {r.subjects_studied.map(s => (
                        <span
                          key={s}
                          style={{
                            background: '#EFF6FF',
                            color: '#2A5C82',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '0.75em',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.achievements && (
                    <div style={{
                      fontSize: '0.82em',
                      color: '#065F46',
                      background: '#F0FDF4',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginBottom: 6,
                    }}>
                      🏆 {r.achievements}
                    </div>
                  )}
                  {r.challenges && (
                    <div style={{
                      fontSize: '0.82em',
                      color: '#92400E',
                      background: '#FFFBEB',
                      padding: '8px 12px',
                      borderRadius: 8,
                    }}>
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

  // ══════════════════════════════════════
  // Stage: Form
  // ══════════════════════════════════════
  const subjectOptions = profile?.target_subjects || [];

  return (
    <div style={{ maxWidth: 700, margin: '30px auto', padding: 25, direction: 'rtl' }}>
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
      }}>
        <h1 style={{ margin: 0, fontSize: '1.4em' }}>📝 تقرير أسبوع {formatWeek(getCurrentWeekStart())}</h1>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        padding: 24,
      }}>

        {/* ساعات الدراسة */}
        <Field label="كم ساعة درست هذا الأسبوع؟">
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="مثال: 25"
            value={form.hours_studied}
            onChange={e => upd('hours_studied', e.target.value)}
            style={inputStyle}
          />
        </Field>

        {/* الأسئلة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="عدد الأسئلة التي حلّيتها">
            <input
              type="number"
              min="0"
              placeholder="مثال: 100"
              value={form.questions_attempted}
              onChange={e => upd('questions_attempted', e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="منها صحيحة">
            <input
              type="number"
              min="0"
              placeholder="مثال: 70"
              value={form.questions_correct}
              onChange={e => upd('questions_correct', e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        {/* المواد */}
        {subjectOptions.length > 0 && (
          <Field label="المواد التي درستها">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
            }}>
              {subjectOptions.map(s => {
                const selected = form.subjects_studied.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: selected ? '2px solid #2A5C82' : '1px solid #E2E8F0',
                      background: selected ? '#EFF6FF' : '#F8FAFC',
                      color: '#1E293B',
                      cursor: 'pointer',
                      fontSize: '0.85em',
                      textAlign: 'right',
                    }}
                  >
                    {selected && '✓ '}{s}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* الحالة النفسية */}
        <Field label="كيف كانت حالتك النفسية؟">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {MOODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => upd('mood', m.value)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 10,
                  border: form.mood === m.value ? `2px solid ${m.color}` : '1px solid #E2E8F0',
                  background: form.mood === m.value ? `${m.color}15` : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.6em' }}>{m.emoji}</div>
                <div style={{ fontSize: '0.82em', marginTop: 4, color: '#1E293B' }}>
                  {m.value}
                </div>
              </button>
            ))}
          </div>
        </Field>

        {/* الإنجازات */}
        <Field label="ما أهم إنجاز هذا الأسبوع؟ (اختياري)">
          <textarea
            rows={2}
            placeholder="مثال: أنهيت فصل Cardiology كاملًا"
            value={form.achievements}
            onChange={e => upd('achievements', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        {/* التحديات */}
        <Field label="ما أكبر تحدي واجهته؟ (اختياري)">
          <textarea
            rows={2}
            placeholder="مثال: التشتت أثناء مراجعة الفارماكولوجي"
            value={form.challenges}
            onChange={e => upd('challenges', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        {/* أزرار */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setStage('list')}
            style={{
              flex: 1,
              padding: 14,
              background: '#fff',
              color: '#64748B',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              fontSize: '1em',
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 2,
              padding: 14,
              background: saving ? '#94A3B8' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '...' : '💾 حفظ التقرير'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// مكونات مساعدة
// ═══════════════════════════════════════

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1E293B',
        fontSize: '0.92em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{
      background: '#F8FAFC',
      padding: 10,
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '1.2em',
        fontWeight: 'bold',
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.72em',
        color: '#64748B',
        marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: '0.95em',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};