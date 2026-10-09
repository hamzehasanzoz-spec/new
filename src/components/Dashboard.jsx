import React from 'react';

export default function Dashboard({ profile }) {
  const hardest = Array.isArray(profile?.hardest_subjects)
    ? profile.hardest_subjects.filter(h => h?.subject)
    : [];

  return (
    <div style={{ maxWidth:900, margin:'30px auto', padding:25, direction:'rtl', textAlign:'right' }}>
      <div style={{ background:'linear-gradient(135deg,#2A5C82 0%,#3B7BA8 100%)', color:'#fff', padding:30, borderRadius:16, marginBottom:25 }}>
        <h1 style={{ margin:'0 0 10px' }}>أهلاً بك، {profile?.full_name || 'زُميلنا'} 👋</h1>
        <p style={{ margin:0, opacity:0.9 }}>
          {profile?.current_stage} — {profile?.university || 'جامعتك'}
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:16 }}>
        <Card title="🎯 هدفك"> {profile?.score_goal || 'غير محدد'} </Card>
        <Card title="⏰ ساعاتك اليومية">{profile?.daily_hours || 'غير محدد'}</Card>
        <Card title="📚 طريقتك">{profile?.study_methods?.join(' / ') || 'غير محدد'}</Card>
        <Card title="🧠 لغة الشرح">{profile?.preferred_language || 'غير محدد'}</Card>
      </div>

      {hardest.length > 0 && (
        <div style={{ marginTop:24, background:'#fff', padding:20, borderRadius:12, border:'1px solid #E2E8F0' }}>
          <h3 style={{ color:'#2A5C82', marginTop:0 }}>أصعب المواد عندك</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {hardest.map((h, i) => (
              <div key={i} style={{ padding:'10px 14px', background:'#FEF3C7', borderRadius:8 }}>
                <strong>{h.subject}</strong> — <span style={{ color:'#92400E' }}>{h.reason || 'بدون سبب محدد'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.biggest_obstacles?.length > 0 && (
        <div style={{ marginTop:20, background:'#fff', padding:20, borderRadius:12, border:'1px solid #E2E8F0' }}>
          <h3 style={{ color:'#2A5C82', marginTop:0 }}>أكبر عوائقك</h3>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {profile.biggest_obstacles.map(o => (
              <span key={o} style={{ background:'#FEE2E2', color:'#991B1B', padding:'5px 12px', borderRadius:6, fontSize:'0.85em' }}>{o}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background:'#fff', padding:18, borderRadius:12, border:'1px solid #E2E8F0' }}>
      <div style={{ color:'#64748B', fontSize:'0.82em', marginBottom:6 }}>{title}</div>
      <div style={{ color:'#1E293B', fontWeight:'bold' }}>{children}</div>
    </div>
  );
}