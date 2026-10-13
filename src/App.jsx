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
import ThemeToggle from './components/ThemeToggle';
import ExamCountdown from './components/ExamCountdown';
import MyConversations from './components/MyConversations';

const MAIN_TABS = [
  { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
  { id: 'chat', label: 'الدردشة', icon: '💬' },
  { id: 'my-chats', label: 'محادثاتي', icon: '📂' },
  { id: 'quiz', label: 'اختبارات', icon: '🎯' },
];

const MORE_TABS = [
  { id: 'files', label: 'ملفاتي', icon: '📚', color: '#2A5C82' },
  { id: 'exam', label: 'محاكاة امتحان', icon: '⏱️', color: '#7C3AED' },
  { id: 'bank', label: 'بنك الأخطاء', icon: '📖', color: '#EF4444' },
  { id: 'weekly', label: 'التقرير الأسبوعي', icon: '📊', color: '#10B981' },
  { id: 'profile', label: 'حسابي', icon: '👤', color: '#2A5C82' },
];

const PAGE_TITLES = {
  dashboard: 'الرئيسية',
  chat: 'الدردشة',
  'my-chats': 'محادثاتي',
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => (
    <>
      {activeTab === 'dashboard' && <Dashboard profile={profile} session={session} />}
      {activeTab === 'chat' && <ChatCoach profile={profile} session={session} />}
      {activeTab === 'my-chats' && (
        <MyConversations
          session={session}
          onOpenConversation={(id) => {
            setActiveTab('chat');
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('open-conversation', { detail: { id } })
              );
            }, 100);
          }}
        />
      )}
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
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--primary)', background: 'var(--bg)', minHeight: '100vh' }}>
        جاري التحميل...
      </div>
    );
  }

  // ═══ تسجيل الدخول ═══
  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, direction: 'rtl',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          padding: isMobile ? 24 : 40,
          background: 'var(--bg-elevated)', borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo size={isMobile ? 52 : 64} showText={false} />
          </div>
          <h2 style={{
            color: 'var(--text)', textAlign: 'center',
            margin: '0 0 8px', fontSize: isMobile ? '1.4em' : '1.6em', fontWeight: 800,
          }}>
            كوتش AI
          </h2>
          <p style={{
            color: 'var(--text-muted)', textAlign: 'center',
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
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85em', color: 'var(--text-muted)' }}>
            {isSignUp ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
            <span onClick={() => setIsSignUp(!isSignUp)}
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
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

  // ═══ Mobile Layout ═══
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        direction: 'rtl',
        paddingBottom: 68,
      }}>
        <nav style={mobileTopBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} showText={false} />
            <div style={{ fontSize: '1em', fontWeight: 800, color: 'var(--primary)' }}>
              {PAGE_TITLES[activeTab] || 'كوتش AI'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExamCountdown />
            <ThemeToggle />
          </div>
        </nav>

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

        <main style={{ padding: '12px' }}>
          {renderContent()}
        </main>

        <div style={bottomBarStyle}>
          {MAIN_TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  ...bottomTabBtn,
                  color: active ? 'var(--primary)' : 'var(--text-subtle)',
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
                    background: 'var(--primary)',
                    borderRadius: 2,
                  }} />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            style={{
              ...bottomTabBtn,
              color: MORE_TABS.some(t => t.id === activeTab) ? 'var(--primary)' : 'var(--text-subtle)',
            }}
          >
            <div style={{ fontSize: '1.4em', lineHeight: 1 }}>⋯</div>
            <div style={{
              fontSize: '0.68em',
              fontWeight: MORE_TABS.some(t => t.id === activeTab) ? 700 : 500,
              marginTop: 3,
            }}>
              المزيد
            </div>
          </button>
        </div>

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
                width: 40, height: 4,
                background: 'var(--border)',
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
                        background: active ? `${t.color}20` : 'var(--bg-subtle)',
                        border: active ? `2px solid ${t.color}` : '1px solid var(--border)',
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
                        color: active ? t.color : 'var(--text)',
                      }}>
                        {t.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{
                padding: '20px 16px',
                borderTop: '1px solid var(--border)',
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

  // ═══ Desktop Layout ═══
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      direction: 'rtl',
    }}>
      <DesktopNav
        activeTab={activeTab}
        switchTab={switchTab}
        onSignOut={() => supabase.auth.signOut()}
      />

      <div style={{
        paddingRight: 'var(--sidebar-width)',
        transition: 'padding-right 0.2s ease',
        minHeight: '100vh',
      }}>
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
          maxWidth: 1200,
          margin: '0 auto',
          padding: '20px 24px',
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Desktop Sidebar
// ═════════════════════════════════════════════
function DesktopNav({ activeTab, switchTab, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const groups = [
    {
      title: 'الرئيسية',
      tabs: [
        { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
        { id: 'chat', label: 'الدردشة', icon: '💬' },
        { id: 'my-chats', label: 'محادثاتي', icon: '📂' },
      ],
    },
    {
      title: 'الدراسة',
      tabs: [
        { id: 'quiz', label: 'اختبارات', icon: '🎯' },
        { id: 'exam', label: 'محاكاة امتحان', icon: '⏱️' },
        { id: 'bank', label: 'بنك الأخطاء', icon: '📖' },
        { id: 'files', label: 'ملفاتي', icon: '📚' },
      ],
    },
    {
      title: 'شخصي',
      tabs: [
        { id: 'weekly', label: 'التقرير الأسبوعي', icon: '📊' },
        { id: 'profile', label: 'حسابي', icon: '👤' },
      ],
    },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-elevated)',
      borderLeft: '1px solid var(--border)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Logo + Collapse */}
      <div style={{
        padding: collapsed ? '16px 8px' : '16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        minHeight: 64,
      }}>
        {!collapsed && <Logo size={30} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'var(--bg-subtle)',
            border: 'none',
            color: 'var(--text-muted)',
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1em',
            flexShrink: 0,
          }}
          title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {collapsed ? '⟩' : '⟨'}
        </button>
      </div>

      {/* Tabs */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <div style={{
                fontSize: '0.68em',
                fontWeight: 700,
                color: 'var(--text-subtle)',
                textTransform: 'uppercase',
                padding: '0 12px',
                marginBottom: 6,
                letterSpacing: 1,
              }}>
                {group.title}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.tabs.map(t => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    title={collapsed ? t.label : undefined}
                    style={{
                      background: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: collapsed ? '10px 8px' : '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.88em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: '1.2em', flexShrink: 0 }}>{t.icon}</span>
                    {!collapsed && <span>{t.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <ThemeToggle />
        </div>

        <button
          onClick={onSignOut}
          title={collapsed ? 'خروج' : undefined}
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#EF4444',
            padding: collapsed ? '10px 8px' : '10px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85em',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>🚪</span>
          {!collapsed && <span>خروج</span>}
        </button>
      </div>
    </aside>
  );
}

// ═════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════
const mobileTopBar = {
  background: 'var(--bg-elevated)',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: 'var(--shadow-sm)',
};

const bottomBarStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'var(--bg-elevated)',
  borderTop: '1px solid var(--border)',
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
  background: 'var(--bg-elevated)',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  zIndex: 301,
  paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
  boxShadow: 'var(--shadow-lg)',
  animation: 'slideUp 0.25s ease-out',
};

const inputStyle = {
  width: '100%', padding: 12, borderRadius: 10,
  border: '1px solid var(--border)', fontSize: '0.95em',
  fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  background: 'var(--bg-subtle)', color: 'var(--text)',
};

const primaryBtn = {
  background: 'var(--primary)', color: '#fff', padding: 14,
  border: 'none', borderRadius: 10, fontWeight: 'bold',
  cursor: 'pointer', fontSize: '0.95em', fontFamily: 'inherit',
};