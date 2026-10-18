import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import { motion } from 'framer-motion';

const FACULTIES = [
  { slug: 'medicine', name: 'الطب البشري', icon: '🩺' },
  { slug: 'dentistry', name: 'طب الأسنان', icon: '🦷' },
  { slug: 'pharmacy', name: 'الصيدلة', icon: '💊' },
];

export default function Waitlist({ onSuccess, onBack, onLoginClick }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', faculty_slug: '', year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.faculty_slug || !form.year) return setError('الرجاء اختيار الكلية والسنة.');
    if (form.password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
    
    setLoading(true);
    setError('');
    
    try {
      // 1. إنشاء حساب للطالب (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('هذا البريد مسجل مسبقاً. الرجاء تسجيل الدخول من الزر أدناه.');
        }
        throw authError;
      }

      // 2. حفظه في جدول الـ Waitlist
      const { error: dbError } = await supabase.from('waitlist').insert([{
        full_name: form.full_name,
        email: form.email,
        faculty_slug: form.faculty_slug,
        year: form.year
      }]);

      if (dbError && dbError.code !== '23505') { // نتجاهل خطأ التكرار إذا كان الحساب قد أنشئ
        throw dbError;
      }
      
      // 3. نجاح
      localStorage.setItem('waitlist_email', form.email);
      onSuccess(form.full_name);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-lg bg-surface-card border border-border rounded-lg p-8"
      >
        <div className="flex justify-center mb-6"><Logo size={48} showText={false} /></div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-content mb-2">احجز مقعدك في النسخة التجريبية</h1>
          <p className="text-sm text-content-muted">أول 1000 طالب فقط. أكمل بياناتك للانضمام إلينا!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-content-muted mb-1">الاسم الكامل</label>
            <input required type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none" placeholder="الاسم الثلاثي" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-content-muted mb-1">البريد الإلكتروني</label>
            <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-muted mb-1">كلمة المرور (لإنشاء حسابك)</label>
            <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none" placeholder="6 أحرف على الأقل" />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-muted mb-1">الكلية</label>
            <div className="grid grid-cols-3 gap-2">
              {FACULTIES.map(f => (
                <button key={f.slug} type="button" onClick={() => setForm({...form, faculty_slug: f.slug, year: ''})}
                  className={`flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${form.faculty_slug === f.slug ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-soft border-border text-content-muted hover:border-content-subtle'}`}>
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs font-bold">{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          {form.faculty_slug && (
            <div>
              <label className="block text-xs font-bold text-content-muted mb-1">السنة الدراسية</label>
              <select required value={form.year} onChange={e => setForm({...form, year: e.target.value})}
                className="w-full bg-surface-soft border border-border rounded-md px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none">
                <option value="">اختر السنة</option>
                <option value="1">السنة الأولى</option>
                <option value="2">السنة الثانية</option>
                <option value="3">السنة الثالثة</option>
                <option value="4">السنة الرابعة</option>
                <option value="5">السنة الخامسة</option>
                {form.faculty_slug === 'medicine' && <option value="6">السنة السادسة</option>}
              </select>
            </div>
          )}

          {error && <div className="bg-danger/10 text-danger text-xs p-3 rounded-md font-semibold">⚠️ {error}</div>}

          <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-md transition-colors mt-4">
            {loading ? 'جاري التسجيل...' : 'تأكيد الحجز والمتابعة للاستبيان 🚀'}
          </button>
        </form>
        
        <div className="text-center mt-6 pt-6 border-t border-border flex flex-col gap-3">
          <button type="button" onClick={onLoginClick} className="text-sm font-semibold text-primary hover:text-primary-light">
            لديك حساب بالفعل؟ سجل دخولك من هنا
          </button>
          <button type="button" onClick={onBack} className="text-xs text-content-subtle hover:text-content">
            ← رجوع للرئيسية
          </button>
        </div>
      </motion.div>
    </div>
  );
}