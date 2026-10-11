import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Questionnaire from './components/Questionnaire';
import Dashboard from './components/Dashboard';
import ChatCoach from './components/ChatCoach';
import Profile from './components/Profile';
import MyFiles from './components/MyFiles';
import Quiz from './components/Quiz';
import QuizBank from './components/QuizBank';
import WeeklyCheckin from './components/WeeklyCheckin';
import Exam from './components/Exam';
import Logo from './components/Logo';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // 🚦 حالة "عمل جارٍ" — يمنع التنقل بدون تأكيد
  const [activeWork, setActiveWork] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data || null);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('تم التسجيل! إذا طُلب تأكيد البريد راجع إيميلك، وإلا سجّل الدخول مباشرة.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      alert('خطأ في المصادقة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚦 تغيير التبويب مع الحماية
  const switchTab = (newTab) => {
    if (newTab === activeTab) return;

    if (activeWork) {
      const confirmed = window.confirm(
        `⚠️ أنت في وسط ${activeWork.type}.\n\n` +
        `إذا غادرت الآن، ستفقد كل التقدم.\n\n` +
        `هل تريد المغادرة؟`
      );
      if (!confirmed) return;
      setActiveWork(null);
    }

    setActiveTab(newTab);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#2A5C82' }}>
        جاري التحميل...
      </div>
    );
  }

  // ═══ شاشة تسجيل الدخول ═══
  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        direction: 'rtl',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(42,92,130,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Logo size={64} showText={false} />
          </div>
          <h2 style={{
            color: '#1E293B',
            textAlign: 'center',
            margin: '0 0 8px',
            fontSize: '1.6em',
            fontWeight: 800,
          }}>
            كوتش AI
          </h2>
          <p style={{
            color: '#64748B',
            textAlign: 'center',
            fontSize: '0.9em',
            marginBottom: 30,
          }}>
            بوابتك للامتحان الوطني للطب في سوريا
          </p>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              required
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              required
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.88em', color: '#64748B' }}>
            {isSignUp ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
            <span
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ color: '#2A5C82', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isSignUp ? 'تسجيل الدخول' : 'أنشئ حساباً'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ═══ الاستبيان ═══
  if (!profile || !profile.questionnaire_completed) {
    return <Questionnaire session={session} onComplete={() => fetchProfile(session.user.id)} />;
  }

  // ═══ التطبيق الرئيسي ═══
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', direction: 'rtl' }}>
      <Nav
        activeTab={activeTab}
        switchTab={switchTab}
        onSignOut={() => supabase.auth.signOut()}
      />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        {activeTab === 'dashboard' && <Dashboard profile={profile} session={session} />}
        {activeTab === 'chat' && <ChatCoach profile={profile} session={session} setActiveWork={setActiveWork} />}
        {activeTab === 'files' && <MyFiles session={session} />}
        {activeTab === 'quiz' && <Quiz profile={profile} setActiveWork={setActiveWork} />}
        {activeTab === 'bank' && <QuizBank session={session} />}
        {activeTab === 'weekly' && <WeeklyCheckin session={session} profile={profile} />}
        {activeTab === 'exam' && <Exam profile={profile} session={session} setActiveWork={setActiveWork} />}
        {activeTab === 'profile' && (
          <Profile
            profile={profile}
            session={session}
            onProfileUpdate={() => fetchProfile(session.user.id)}
          />
        )}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════
// 🎨 Nav معاد التصميم — مجموعات منفصلة
// ═════════════════════════════════════════════
function Nav({ activeTab, switchTab, onSignOut }) {
  const mainTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
    { id: 'chat', label: 'الدردشة', icon: '💬' },
    { id: 'files', label: 'ملفاتي', icon: '📚' },
  ];

  const studyTabs = [
    { id: 'quiz', label: 'اختبارات', icon: '🎯' },
    { id: 'exam', label: 'محاكاة', icon: '⏱️' },
    { id: 'bank', label: 'بنك الأخطاء', icon: '📖' },
  ];

  const personalTabs = [
    { id: 'weekly', label: 'التقرير', icon: '📊' },
    { id: 'profile', label: 'حسابي', icon: '👤' },
  ];

  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, flexWrap: 'wrap' }}>
        <Logo size={34} />

        {/* المجموعة 1: الرئيسية */}
        <div style={groupStyle}>
          {mainTabs.map(t => (
            <TabButton
              key={t.id}
              tab={t}
              active={activeTab === t.id}
              onClick={() => switchTab(t.id)}
            />
          ))}
        </div>

        <div style={dividerStyle} />

        {/* المجموعة 2: الدراسة */}
        <div style={groupStyle}>
          {studyTabs.map(t => (
            <TabButton
              key={t.id}
              tab={t}
              active={activeTab === t.id}
              onClick={() => switchTab(t.id)}
            />
          ))}
        </div>

        <div style={dividerStyle} />

        {/* المجموعة 3: الشخصي */}
        <div style={groupStyle}>
          {personalTabs.map(t => (
            <TabButton
              key={t.id}
              tab={t}
              active={activeTab === t.id}
              onClick={() => switchTab(t.id)}
            />
          ))}
        </div>
      </div>

      <button onClick={onSignOut} style={signOutStyle}>
        خروج
      </button>
    </nav>
  );
}

function TabButton({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#2A5C82' : 'transparent',
        color: active ? '#fff' : '#475569',
        border: 'none',
        padding: '8px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        fontSize: '0.86em',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s ease',
        boxShadow: active ? '0 2px 8px rgba(42,92,130,0.25)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = '#F1F5F9';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: '1.05em' }}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

// ═════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════
const navStyle = {
  background: '#fff',
  padding: '12px 24px',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  flexWrap: 'wrap',
};

const groupStyle = {
  display: 'flex',
  gap: 2,
  alignItems: 'center',
};

const dividerStyle = {
  width: 1,
  height: 22,
  background: '#E2E8F0',
};

const signOutStyle = {
  background: '#FEF2F2',
  color: '#EF4444',
  border: '1px solid #FECACA',
  padding: '8px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85em',
};

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  fontSize: '0.95em',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border 0.15s',
};

const primaryBtn = {
  background: '#2A5C82',
  color: '#fff',
  padding: 14,
  border: 'none',
  borderRadius: 10,
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.95em',
};