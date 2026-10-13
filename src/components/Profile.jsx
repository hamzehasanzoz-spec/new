import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import { uploadAvatar, deleteAvatar } from '../lib/avatar';

export default function Profile({ profile, session, onUpdate, onProfileUpdate }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    university: profile?.university || '',
    current_stage: profile?.current_stage || '',
    score_goal: profile?.score_goal || '',
    daily_hours: profile?.daily_hours || '',
    preferred_language: profile?.preferred_language || '',
    biggest_obstacles: profile?.biggest_obstacles || [],
  });

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleObstacle = (opt) => {
    setForm(prev => ({
      ...prev,
      biggest_obstacles: prev.biggest_obstacles.includes(opt)
        ? prev.biggest_obstacles.filter(o => o !== opt)
        : [...prev.biggest_obstacles, opt],
    }));
  };

  const refresh = () => {
    if (onProfileUpdate) onProfileUpdate();
    else if (onUpdate) onUpdate();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
      if (error) throw error;
      refresh();
      setEditing(false);
    } catch (err) {
      alert('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return alert('كلمة المرور 6 أحرف على الأقل');
    if (newPassword !== confirmPassword) return alert('كلمتا المرور غير متطابقتين');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('✅ تم تغيير كلمة المرور');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
    } catch (err) {
      alert('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeQuestionnaire = async () => {
    if (!confirm('سيتم مسح إجاباتك الحالية وإعادة الاستبيان. متابعة؟')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ questionnaire_completed: false })
        .eq('id', session.user.id);
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    await supabase.auth.signOut();
  };

  const stats = {
    subjects: profile?.target_subjects?.length || 0,
    weak: Object.values(profile?.subject_levels || {}).filter(l => l === 'ضعيف').length,
    strong: Object.values(profile?.subject_levels || {}).filter(l => l === 'ممتاز').length,
  };

  const obstacles = [
    'التشتت وعدم التركيز', 'النسيان السريع', 'ضيق الوقت', 'الإرهاق الجسدي',
    'القلق والتوتر', 'الملل', 'ضغط الأهل', 'عدم وجود بيئة مناسبة',
    'كثرة المصادر وعدم وضوح الوجهة',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <Avatar
            profile={profile}
            size={80}
            editable={true}
            onUpload={async (file) => {
              await uploadAvatar(session.user.id, file);
              refresh();
            }}
            onDelete={async () => {
              await deleteAvatar(session.user.id);
              refresh();
            }}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-content mb-1">
              {profile?.full_name || 'زميلنا العزيز'}
            </h1>
            <p className="text-sm text-content-muted">
              {profile?.current_stage || 'مرحلتك'} — {profile?.university || 'جامعتك'}
            </p>
            <p className="text-xs text-content-subtle mt-1">
              📧 {session?.user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon="📚" value={stats.subjects} label="مواد مسجلة" color="text-primary" />
        <StatBox icon="⚠️" value={stats.weak} label="مواد ضعيفة" color="text-danger" />
        <StatBox icon="⭐" value={stats.strong} label="مواد ممتازة" color="text-success" />
      </div>

      {/* Personal Info */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-content">
            📋 معلوماتك الشخصية
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs bg-primary hover:bg-primary-light text-white font-semibold px-4 py-2 rounded-md transition-colors"
            >
              ✏️ تعديل
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setForm({
                  full_name: profile?.full_name || '',
                  university: profile?.university || '',
                  current_stage: profile?.current_stage || '',
                  score_goal: profile?.score_goal || '',
                  daily_hours: profile?.daily_hours || '',
                  preferred_language: profile?.preferred_language || '',
                  biggest_obstacles: profile?.biggest_obstacles || [],
                }); }}
                className="text-xs bg-surface-soft border border-border text-content-muted hover:text-content px-4 py-2 rounded-md transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="text-xs bg-success hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md transition-opacity disabled:opacity-50"
              >
                {loading ? '...' : '💾 حفظ'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="space-y-2">
            <InfoRow label="الاسم الكامل" value={profile?.full_name} />
            <InfoRow label="الجامعة" value={profile?.university} />
            <InfoRow label="المرحلة" value={profile?.current_stage} />
            <InfoRow label="هدف العلامة" value={profile?.score_goal} />
            <InfoRow label="ساعات الدراسة اليومية" value={profile?.daily_hours} />
            <InfoRow label="لغة الشرح" value={profile?.preferred_language} />
            <InfoRow
              label="أكبر العوائق"
              value={profile?.biggest_obstacles?.length
                ? profile.biggest_obstacles.join('، ')
                : null}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="الاسم الكامل">
              <input
                type="text"
                value={form.full_name}
                onChange={e => upd('full_name', e.target.value)}
                className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </Field>

            <Field label="الجامعة">
              <input
                type="text"
                value={form.university}
                onChange={e => upd('university', e.target.value)}
                className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </Field>

            <Field label="المرحلة">
              <RadioGroup
                options={['سنة رابعة', 'سنة خامسة', 'متخرج', 'إعادة']}
                value={form.current_stage}
                onChange={v => upd('current_stage', v)}
                cols={4}
              />
            </Field>

            <Field label="هدف العلامة">
              <RadioGroup
                options={['نجاح فقط', 'معدل جيد', 'ترتيب عالي', 'اختصاص معين']}
                value={form.score_goal}
                onChange={v => upd('score_goal', v)}
                cols={2}
              />
            </Field>

            <Field label="ساعات الدراسة اليومية">
              <RadioGroup
                options={['أقل من ساعة', '1-2 ساعة', '3-4 ساعات', '5-6 ساعات', 'أكثر من 6 ساعات']}
                value={form.daily_hours}
                onChange={v => upd('daily_hours', v)}
                cols={3}
              />
            </Field>

            <Field label="لغة الشرح">
              <RadioGroup
                options={['عربي', 'إنجليزي', 'مزيج']}
                value={form.preferred_language}
                onChange={v => upd('preferred_language', v)}
                cols={3}
              />
            </Field>

            <Field label="أكبر العوائق">
              <div className="grid grid-cols-2 gap-2">
                {obstacles.map(opt => (
                  <label
                    key={opt}
                    className={`
                      flex items-center gap-2 p-3 rounded-md cursor-pointer border text-xs transition-all
                      ${form.biggest_obstacles.includes(opt)
                        ? 'bg-primary/10 border-primary text-content'
                        : 'bg-surface-soft border-border text-content-muted hover:border-content-subtle'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={form.biggest_obstacles.includes(opt)}
                      onChange={() => toggleObstacle(opt)}
                      className="w-3.5 h-3.5 accent-primary cursor-pointer"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h2 className="text-base font-bold text-content mb-4">
          🔐 إعدادات الحساب
        </h2>

        {!changingPassword ? (
          <button
            onClick={() => setChangingPassword(true)}
            className="w-full bg-surface-soft border border-border text-content hover:border-content-subtle py-3 rounded-md font-semibold text-sm transition-colors"
          >
            🔑 تغيير كلمة المرور
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <input
              type="password"
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
                className="flex-1 bg-surface-soft border border-border text-content-muted hover:text-content py-3 rounded-md font-semibold text-sm transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="flex-1 bg-success hover:opacity-90 text-white py-3 rounded-md font-semibold text-sm transition-opacity disabled:opacity-50"
              >
                {loading ? '...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h2 className="text-base font-bold text-content mb-4">
          ⚙️ إجراءات إضافية
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRetakeQuestionnaire}
            disabled={loading}
            className="bg-warn hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity disabled:opacity-50"
          >
            🔄 إعادة الاستبيان
          </button>
          <button
            onClick={handleSignOut}
            className="bg-danger hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity"
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>

    </div>
  );
}

function StatBox({ icon, value, label, color }) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold tabular-nums mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-content-subtle">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2.5 px-3 bg-surface-soft rounded-md">
      <span className="text-xs text-content-muted">{label}</span>
      <span className="text-sm font-semibold text-content text-left">
        {value || <span className="text-content-subtle font-normal">—</span>}
      </span>
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

function RadioGroup({ options, value, onChange, cols = 2 }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`
              py-2.5 px-2 rounded-md text-xs font-semibold transition-all border
              ${active
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-surface-soft border-border text-content-muted hover:border-content-subtle'
              }
            `}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}