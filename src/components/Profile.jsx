import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Profile({ profile, session, onProfileUpdate }) {
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

  const upd = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleObstacle = (opt) => {
    setForm(prev => ({
      ...prev,
      biggest_obstacles: prev.biggest_obstacles.includes(opt)
        ? prev.biggest_obstacles.filter(o => o !== opt)
        : [...prev.biggest_obstacles, opt],
    }));
  };

  // حفظ التعديلات
  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...form,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setEditing(false);
      alert('✅ تم الحفظ بنجاح');
    } catch (err) {
      alert('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // تغيير كلمة المرور
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
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

  // إعادة الاستبيان
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

  // تسجيل خروج
  const handleSignOut = async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    await supabase.auth.signOut();
  };

  // إحصائيات
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
    <div style={{
      maxWidth: 900,
      margin: '30px auto',
      padding: 25,
      direction: 'rtl',
      textAlign: 'right',
    }}>

      {/* ===== Card رئيسي ===== */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff',
        padding: 30,
        borderRadius: 16,
        marginBottom: 25,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5em',
          }}>
            👨‍⚕️
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.6em' }}>
              {profile?.full_name || 'زُميلنا العزيز'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {profile?.current_stage || 'مرحلتك'} — {profile?.university || 'جامعتك'}
            </p>
            <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.9em' }}>
              📧 {session?.user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* ===== الإحصائيات ===== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 25,
      }}>
        <StatBox icon="📚" label="مواد مسجلة" value={stats.subjects} color="#2A5C82" />
        <StatBox icon="⚠️" label="مواد ضعيفة" value={stats.weak} color="#EF4444" />
        <StatBox icon="⭐" label="مواد ممتازة" value={stats.strong} color="#10B981" />
      </div>

      {/* ===== بيانات البروفايل ===== */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <h2 style={{ color: '#2A5C82', margin: 0, fontSize: '1.2em' }}>
            📋 معلوماتك الشخصية
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              style={btnStyle('#2A5C82')}
            >
              ✏️ تعديل
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
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
                style={btnStyle('#94A3B8')}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={btnStyle('#10B981')}
              >
                {loading ? '...' : '💾 حفظ'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          // ===== وضع العرض =====
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row label="الاسم الكامل" value={profile?.full_name} />
            <Row label="الجامعة" value={profile?.university} />
            <Row label="المرحلة" value={profile?.current_stage} />
            <Row label="هدف العلامة" value={profile?.score_goal} />
            <Row label="ساعات الدراسة اليومية" value={profile?.daily_hours} />
            <Row label="لغة الشرح المفضلة" value={profile?.preferred_language} />
            <Row
              label="أكبر العوائق"
              value={
                profile?.biggest_obstacles?.length
                  ? profile.biggest_obstacles.join('، ')
                  : null
              }
            />
          </div>
        ) : (
          // ===== وضع التعديل =====
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="الاسم الكامل">
              <input
                type="text"
                value={form.full_name}
                onChange={e => upd('full_name', e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="الجامعة">
              <input
                type="text"
                value={form.university}
                onChange={e => upd('university', e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="المرحلة">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['سنة رابعة', 'سنة خامسة', 'متخرج', 'إعادة'].map(opt => (
                  <RadioBtn
                    key={opt}
                    label={opt}
                    selected={form.current_stage === opt}
                    onClick={() => upd('current_stage', opt)}
                  />
                ))}
              </div>
            </Field>

            <Field label="هدف العلامة">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {['نجاح فقط', 'معدل جيد', 'ترتيب عالي', 'اختصاص معين'].map(opt => (
                  <RadioBtn
                    key={opt}
                    label={opt}
                    selected={form.score_goal === opt}
                    onClick={() => upd('score_goal', opt)}
                  />
                ))}
              </div>
            </Field>

            <Field label="ساعات الدراسة اليومية">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['أقل من ساعة', '1-2 ساعة', '3-4 ساعات', '5-6 ساعات', 'أكثر من 6 ساعات'].map(opt => (
                  <RadioBtn
                    key={opt}
                    label={opt}
                    selected={form.daily_hours === opt}
                    onClick={() => upd('daily_hours', opt)}
                  />
                ))}
              </div>
            </Field>

            <Field label="لغة الشرح المفضلة">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['عربي', 'إنجليزي', 'مزيج (عربي + إنجليزي)'].map(opt => (
                  <RadioBtn
                    key={opt}
                    label={opt}
                    selected={form.preferred_language === opt}
                    onClick={() => upd('preferred_language', opt)}
                  />
                ))}
              </div>
            </Field>

            <Field label="أكبر العوائق (اختر كل ما ينطبق)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {obstacles.map(opt => (
                  <RadioBtn
                    key={opt}
                    label={opt}
                    selected={form.biggest_obstacles.includes(opt)}
                    onClick={() => toggleObstacle(opt)}
                    multi
                  />
                ))}
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* ===== إعدادات الحساب ===== */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        marginBottom: 20,
      }}>
        <h2 style={{ color: '#2A5C82', marginTop: 0, fontSize: '1.2em' }}>
          🔐 إعدادات الحساب
        </h2>

        {/* تغيير كلمة المرور */}
        {!changingPassword ? (
          <button
            onClick={() => setChangingPassword(true)}
            style={{ ...btnStyle('#2A5C82'), width: '100%', padding: 12 }}
          >
            🔑 تغيير كلمة المرور
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
                style={btnStyle('#94A3B8')}
              >
                إلغاء
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                style={btnStyle('#10B981')}
              >
                {loading ? '...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== إجراءات متقدمة ===== */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 14,
        border: '1px solid #E2E8F0',
      }}>
        <h2 style={{ color: '#2A5C82', marginTop: 0, fontSize: '1.2em' }}>
          ⚙️ إجراءات إضافية
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleRetakeQuestionnaire}
            disabled={loading}
            style={btnStyle('#F59E0B')}
          >
            🔄 إعادة الاستبيان
          </button>
          <button
            onClick={handleSignOut}
            style={btnStyle('#EF4444')}
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// مكونات مساعدة
// ─────────────────────────────────────────

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#fff',
      padding: 16,
      borderRadius: 12,
      border: `2px solid ${color}20`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.8em', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '1.6em', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '0.82em', color: '#64748B', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: '#F8FAFC',
      borderRadius: 8,
      gap: 12,
    }}>
      <span style={{ color: '#64748B', fontSize: '0.9em' }}>{label}</span>
      <span style={{ color: '#1E293B', fontWeight: 'bold', fontSize: '0.92em', textAlign: 'left' }}>
        {value || <span style={{ color: '#CBD5E1', fontWeight: 'normal' }}>—</span>}
      </span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, color: '#1E293B', fontSize: '0.9em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function RadioBtn({ label, selected, onClick, multi }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: selected ? '2px solid #2A5C82' : '1px solid #E2E8F0',
        background: selected ? '#EFF6FF' : '#F8FAFC',
        color: '#1E293B',
        cursor: 'pointer',
        fontSize: '0.85em',
        textAlign: 'center',
      }}
    >
      {selected && (multi ? '✓ ' : '● ')}{label}
    </button>
  );
}

const inputStyle = {
  width: '100%',
  padding: 11,
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: '0.95em',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function btnStyle(bg) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9em',
  };
}