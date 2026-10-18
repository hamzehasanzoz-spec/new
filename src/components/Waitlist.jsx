import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import { motion } from 'framer-motion';

const FACULTIES = [
  { slug: 'medicine', name: 'الطب البشري', icon: '🩺' },
  { slug: 'dentistry', name: 'طب الأسنان', icon: '🦷' },
  { slug: 'pharmacy', name: 'الصيدلة', icon: '💊' },
];

export default function Waitlist({ onSuccess, onBack }) {
  const [form, setForm] = useState({ full_name: '', email: '', faculty_slug: '', year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.faculty_slug || !form.year) return setError('الرجاء اختيار الكلية والسنة.');
    
    setLoading(true);
    setError('');
    
    try {
      const { error: dbError } = await supabase.from('waitlist').insert([form]);
      if (dbError) {
        if (dbError.code === '23505') throw new Error('هذا الإيميل مسجل بالفعل في قائمة الانتظار.');
        throw dbError;
      }
      
      // حفظ الإيميل في الـ local storage للاستخدام لاحقاً عند الإطلاق
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
          <p className="text-sm text-content-muted">أول 1000 طالب فقط. انضم إلينا الآن!</p>
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

          {error && <div className="bg-danger/10 text-danger text-xs p-3 rounded-md">⚠️ {error}</div>}

          <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-md transition-colors mt-4">
            {loading ? 'جاري الحجز...' : 'تأكيد حجز المقعد 🚀'}
          </button>
          
          <button type="button" onClick={onBack} className="w-full text-xs text-content-subtle hover:text-content mt-2">← رجوع للرئيسية</button>
        </form>
      </motion.div>
    </div>
  );
}