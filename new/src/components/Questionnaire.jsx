import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Questionnaire({ session, onComplete }) {
  const [formData, setFormData] = useState({
    full_name: '',
    study_style: 'بصري',
    study_times: 'صباحي',
    weak_subjects: [],
    medical_background: ''
  });
  const [loading, setLoading] = useState(false);

  const subjects = [
    'الداخلية العصبية', 'الداخلية القلبية', 'الجراحة العامة', 
    'الأطفال', 'النسائية والتوليد', 'الفارماكولوجي', 'الباثولوجي'
  ];

  const handleSubjectToggle = (subj) => {
    setFormData(prev => ({
      ...prev,
      weak_subjects: prev.weak_subjects.includes(subj)
        ? prev.weak_subjects.filter(s => s !== subj)
        : [...prev.weak_subjects, subj]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        ...formData,
        questionnaire_completed: true,
        updated_at: new Date()
      });

      if (error) throw error;
      if (onComplete) onComplete();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ الاستبيان: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', direction: 'rtl', textAlign: 'right' }}>
      <h2 style={{ color: '#2A5C82', marginBottom: '10px' }}>مرحباً بك في كوتش AI 🩺</h2>
      <p style={{ color: '#64748B', marginBottom: '25px' }}>أجب عن الأسئلة التالية لنخصص لك خطة مراجعة ذكية لامتحان الوطني للطب في سوريا.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>الاسم الكامل:</label>
          <input 
            type="text" 
            required
            value={formData.full_name}
            onChange={e => setFormData({...formData, full_name: e.target.value})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
            placeholder="ادخل اسمك الثلاثي"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>أسلوب الدراسة المفضل لديك:</label>
          <select 
            value={formData.study_style}
            onChange={e => setFormData({...formData, study_style: e.target.value})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
          >
            <option value="بصري">بصري (مخططات وجداول)</option>
            <option value="قراءة وتلخيص">قراءة وتلخيص مكثف</option>
            <option value="حل دورات وأسئلة">حل دورات وأسئلة مكثفة</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>اختر المواد التي تجد صعوبة فيها (الضعيفة):</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            {subjects.map(subj => (
              <label key={subj} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #E2E8F0' }}>
                <input 
                  type="checkbox" 
                  checked={formData.weak_subjects.includes(subj)}
                  onChange={() => handleSubjectToggle(subj)}
                />
                <span style={{ fontSize: '0.9em' }}>{subj}</span>
              </label>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ background: '#2A5C82', color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em', marginTop: '10px' }}
        >
          {loading ? 'جاري الحفظ...' : 'بدء رحلة التحضير للإمتحان الوطني 🚀'}
        </button>
      </form>
    </div>
  );
}
updated_at: new Date().toISOString()