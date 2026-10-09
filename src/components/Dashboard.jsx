import React from 'react';

export default function Dashboard({ session, profile }) {
  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '25px', direction: 'rtl', textAlign: 'right' }}>
      <div style={{ background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)', color: '#fff', padding: '30px', borderRadius: '16px', marginBottom: '25px' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>أهلاً بك، د. {profile?.full_name || 'زُميلنا العزيز'} 👋</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>جاهز لتحقيق أعلى علامة في الامتحان الوطني للطب في سوريا؟</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#2A5C82', marginBottom: '8px' }}>أسلوب الدراسة</h3>
          <p style={{ color: '#64748B', margin: 0 }}>{profile?.study_style || 'غير محدد'}</p>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#2A5C82', marginBottom: '8px' }}>المواد المستهدفة بالتركيز</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {profile?.weak_subjects?.length > 0 ? (
              profile.weak_subjects.map(subj => (
                <span key={subj} style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85em' }}>{subj}</span>
              ))
            ) : (
              <span style={{ color: '#64748B' }}>لم تحدد مواد بعد</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}