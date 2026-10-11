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
import { useIsMobile } from './hooks/useMediaQuery';

// ═══════════════════════════════════════
// تعريف التبويبات
// ═══════════════════════════════════════
const MAIN_TABS = [
  { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
  { id: 'chat', label: 'الدردشة', icon: '💬' },
  { id: 'files', label: 'ملفاتي', icon: '📚' },
  { id: 'quiz', label: 'اختبارات', icon: '🎯' },
];

const MORE_TABS = [
  { id: 'exam', label: 'محاكاة امتحان', icon: '⏱️', color: '#7C3AED' },
  { id: 'bank', label: 'بنك الأخطاء', icon: '📖', color: '#EF4444' },
  { id: 'weekly', label: 'التقرير الأسبوعي', icon: '📊', color: '#10B981' },
  { id: 'profile', label: 'حسابي', icon: '👤', color: '#2A5C82' },
];

const PAGE_TITLES = {
  dashboard: 'الرئيسية',
  chat: 'الدردشة',
  files: 'ملفاتي',
  quiz: 'اختبارات',
  exam: 'محاكاة امتحان',
  bank: 'بنك الأخطاء',
  weekly: 'التقرير الأسبوعي',
  profile: 'حسابي',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeWork, setActiveWork] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const isMobile = useIsMobile();

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
        alert('تم التسجيل!');
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

  const switchTab = (newTab) => {
    setMoreOpen(false);
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
    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => (
    <>
      {activeTab === 'dashboard' && <Dashboard profile={profile} session={session} />}
      {activeTab === 'chat' && <ChatCoach profile={profile} session={session} />}
      {activeTab === 'files' && <MyFiles session={session} />}
      {activeTab === 'quiz' && <Quiz profile={profile} setActiveWork={setActiveWork} />}
      {activeTab === 'bank' && <QuizBank session={session} />}
      {activeTab === 'weekly' && <WeeklyCheckin session={session} profile={profile} />}
      {activeTab === 'exam' && <Exam profile={profile} session={session} setActiveWork={setActiveWork} />}
      {activeTab === 'profile' && (
        <Profile profile={profile} session={session} onUpdate={() => fetchProfile(session.user.id)} />
      )}
    </>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#2A5C82' }}>
        جاري التحميل...
      </div>
    );
  }

  // ═══ تسجيل الدخول ═══
  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, direction: 'rtl',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          padding: isMobile ? 24 : 40,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(42,92,130,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo size={isMobile ? 52 : 64} showText={false} />
          </div>
          <h2 style={{
            color: '#1E293B', textAlign: 'center',
            margin: '0 0 8px', fontSize: isMobile ? '1.4em' : '1.6em', fontWeight: 800,
          }}>
            كوتش AI
          </h2>
          <p style={{
            color: '#64748B', textAlign: 'center',
            fontSize: '0.88em', marginBottom: 24,
          }}>
            بوابتك للامتحان الوطني للطب في سوريا
          </p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" required placeholder="البريد الإلكتروني"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" required placeholder="كلمة المرور"
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85em', color: '#64748B' }}>
            {isSignUp ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
            <span onClick={() => setIsSignUp(!isSignUp)}
              style={{ color: '#2A5C82', cursor: 'pointer', fontWeight: 'bold' }}>
              {isSignUp ? 'تسجيل الدخول' : 'أنشئ حساباً'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !profile.questionnaire_completed) {
    return <Questionnaire session={session} onComplete={() => fetchProfile(session.user.id)} />;
  }

  // ═══════════════════════════════════════════
  // 📱 تصميم الجوال — Bottom Tab Bar
  // ═══════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        direction: 'rtl',
        paddingBottom: 68, // مساحة للـ bottom bar
      }}>
        {/* ═══ شريط علوي رفيع ═══ */}
        <nav style={mobileTopBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} showText={false} />
            <div style={{
              fontSize: '1em',
              fontWeight: 800,
              color: '#2A5C82',
            }}>
              {PAGE_TITLES[activeTab] || 'كوتش AI'}
            </div>
          </div>

          {activeWork && (
            <div style={{
              fontSize: '0.72em',
              color: '#92400E',
              background: '#FEF3C7',
              padding: '4px 10px',
              borderRadius: 20,
              fontWeight: 600,
            }}>
              ⏸️ قيد التنفيذ
            </div>
          )}
        </nav>

        {/* ═══ المحتوى ═══ */}
        <main style={{ padding: '12px' }}>
          {renderContent()}
        </main>

        {/* ═══ Bottom Tab Bar ═══ */}
        <div style={bottomBarStyle}>
          {MAIN_TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  ...bottomTabBtn,
                  color: active ? '#2A5C82' : '#94A3B8',
                }}
              >
                <div style={{
                  fontSize: '1.4em',
                  lineHeight: 1,
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s',
                }}>
                  {t.icon}
                </div>
                <div style={{
                  fontSize: '0.68em',
                  fontWeight: active ? 700 : 500,
                  marginTop: 3,
                }}>
                  {t.label}
                </div>
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    width: 24,
                    height: 3,
                    background: '#2A5C82',
                    borderRadius: 2,
                  }} />
                )}
              </button>
            );
          })}

          {/* زر "المزيد" */}
          <button
            onClick={() => setMoreOpen(true)}
            style={{
              ...bottomTabBtn,
              color: MORE_TABS.some(t => t.id === activeTab) ? '#2A5C82' : '#94A3B8',
            }}
          >
            <div style={{
              fontSize: '1.4em',
              lineHeight: 1,
            }}>
              ⋯
            </div>
            <div style={{
              fontSize: '0.68em',
              fontWeight: MORE_TABS.some(t => t.id === activeTab) ? 700 : 500,
              marginTop: 3,
            }}>
              المزيد
            </div>
          </button>
        </div>

        {/* ═══ Drawer "المزيد" ═══ */}
        {moreOpen && (
          <>
            <div
              onClick={() => setMoreOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 300,
                animation: 'fadeIn 0.2s',
              }}
            />
            <div style={moreDrawerStyle}>
              <div style={{
                width: 40,
                height: 4,
                background: '#CBD5E1',
                borderRadius: 2,
                margin: '12px auto 16px',
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                padding: '0 16px',
              }}>
                {MORE_TABS.map(t => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => switchTab(t.id)}
                      style={{
                        background: active ? `${t.color}15` : '#F8FAFC',
                        border: active ? `2px solid ${t.color}` : '1px solid #E2E8F0',
                        borderRadius: 14,
                        padding: '18px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'center',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: '1.8em', lineHeight: 1 }}>{t.icon}</div>
                      <div style={{
                        fontSize: '0.82em',
                        fontWeight: 700,
                        color: active ? t.color : '#1E293B',
                      }}>
                        {t.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{
                padding: '20px 16px',
                borderTop: '1px solid #F1F5F9',
                marginTop: 20,
              }}>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    supabase.auth.signOut();
                  }}
                  style={{
                    width: '100%',
                    padding: 14,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#EF4444',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: '0.95em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>🚪</span>
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 💻 تصميم الديسكتوب
  // ═══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', direction: 'rtl' }}>
      <DesktopNav
        activeTab={activeTab}
        switchTab={switchTab}
        onSignOut={() => supabase.auth.signOut()}
      />

      {activeWork && (
        <div style={{
          background: '#FEF3C7',
          borderBottom: '1px solid #F59E0B',
          padding: '8px 16px', fontSize: '0.82em',
          color: '#92400E', textAlign: 'center', fontWeight: 600,
        }}>
          ⏸️ {activeWork.type} قيد التنفيذ — لا تغادر الصفحة
        </div>
      )}

      <main style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '20px 16px',
      }}>
        {renderContent()}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════
// Desktop Nav
// ═════════════════════════════════════════════
function DesktopNav({ activeTab, switchTab, onSignOut }) {
  const allTabs = [...MAIN_TABS, ...MORE_TABS];
  const mainTabs = allTabs.slice(0, 3);
  const studyTabs = allTabs.slice(3, 6);
  const personalTabs = allTabs.slice(6, 8);

  return (
    <nav style={desktopNavStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap' }}>
        <Logo size={34} />
        <div style={groupStyle}>
          {mainTabs.map(t => (
            <TabButton key={t.id} tab={t} active={activeTab === t.id} onClick={() => switchTab(t.id)} />
          ))}
        </div>
        <div style={dividerStyle} />
        <div style={groupStyle}>
          {studyTabs.map(t => (
            <TabButton key={t.id} tab={t} active={activeTab === t.id} onClick={() => switchTab(t.id)} />
          ))}
        </div>
        <div style={dividerStyle} />
        <div style={groupStyle}>
          {personalTabs.map(t => (
            <TabButton key={t.id} tab={t} active={activeTab === t.id} onClick={() => switchTab(t.id)} />
          ))}
        </div>
      </div>
      <button onClick={onSignOut} style={signOutStyle}>خروج</button>
    </nav>
  );
}

function TabButton({ tab, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#2A5C82' : 'transparent',
      color: active ? '#fff' : '#475569',
      border: 'none', padding: '8px 12px', borderRadius: 8,
      cursor: 'pointer', fontWeight: active ? 700 : 500,
      fontSize: '0.84em', display: 'flex', alignItems: 'center', gap: 5,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 2px 8px rgba(42,92,130,0.25)' : 'none',
      fontFamily: 'inherit',
    }}>
      <span style={{ fontSize: '1.05em' }}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

// ═════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════
const mobileTopBar = {
  background: '#fff',
  padding: '12px 16px',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const bottomBarStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: '#fff',
  borderTop: '1px solid #E2E8F0',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  zIndex: 90,
  boxShadow: '0 -2px 12px rgba(0,0,0,0.05)',
};

const bottomTabBtn = {
  background: 'transparent',
  border: 'none',
  padding: '10px 4px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  fontFamily: 'inherit',
  transition: 'color 0.15s',
};

const moreDrawerStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: '#fff',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  zIndex: 301,
  paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
  animation: 'slideUp 0.25s ease-out',
};

const desktopNavStyle = {
  background: '#fff', padding: '12px 20px',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  gap: 12, position: 'sticky', top: 0, zIndex: 100,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap',
};

const groupStyle = { display: 'flex', gap: 2, alignItems: 'center' };
const dividerStyle = { width: 1, height: 22, background: '#E2E8F0' };

const signOutStyle = {
  background: '#FEF2F2', color: '#EF4444',
  border: '1px solid #FECACA',
  padding: '8px 16px', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, fontSize: '0.85em',
  fontFamily: 'inherit',
};

const inputStyle = {
  width: '100%', padding: 12, borderRadius: 10,
  border: '1px solid #E2E8F0', fontSize: '0.95em',
  fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
};

const primaryBtn = {
  background: '#2A5C82', color: '#fff', padding: 14,
  border: 'none', borderRadius: 10, fontWeight: 'bold',
  cursor: 'pointer', fontSize: '0.95em', fontFamily: 'inherit',
};