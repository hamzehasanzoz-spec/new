import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Questionnaire from './components/Questionnaire';
import Dashboard from './components/Dashboard';
import ChatCoach from './components/ChatCoach';
import Profile from './components/Profile';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#2A5C82' }}>
        جاري التحميل...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 30, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', direction: 'rtl' }}>
        <h2 style={{ color: '#2A5C82', textAlign: 'center' }}>منصة كوتش AI 🩺</h2>
        <p style={{ color: '#64748B', textAlign: 'center', fontSize: '0.9em' }}>بوابتك للامتحان الوطني للطب في سوريا</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input
            type="email" required placeholder="البريد الإلكتروني"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}
          />
          <input
            type="password" required placeholder="كلمة المرور"
            value={password} onChange={e => setPassword(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}
          />
          <button
            type="submit"
            style={{ background: '#2A5C82', color: '#fff', padding: 12, border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 15, fontSize: '0.9em' }}>
          {isSignUp ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ color: '#2A5C82', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSignUp ? 'تسجيل الدخول' : 'أنشئ حساباً الآن'}
          </span>
        </p>
      </div>
    );
  }

  if (!profile || !profile.questionnaire_completed) {
    return <Questionnaire session={session} onComplete={() => fetchProfile(session.user.id)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <nav style={{
        background: '#fff',
        padding: '15px 30px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        direction: 'rtl',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <h2 style={{ color: '#2A5C82', margin: 0 }}>كوتش AI 🩺</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: activeTab === 'dashboard' ? '#2A5C82' : 'transparent',
              color: activeTab === 'dashboard' ? '#fff' : '#1E293B',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            الرئيسية
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              background: activeTab === 'chat' ? '#2A5C82' : 'transparent',
              color: activeTab === 'chat' ? '#fff' : '#1E293B',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            الدردشة الذكية
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              background: activeTab === 'profile' ? '#2A5C82' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : '#1E293B',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            👤 بروفايلي
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: '#EF4444',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            خروج
          </button>
        </div>
      </nav>

      <main style={{ padding: 20 }}>
        {activeTab === 'dashboard' && <Dashboard profile={profile} />}
        {activeTab === 'chat' && <ChatCoach profile={profile} session={session} />}
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