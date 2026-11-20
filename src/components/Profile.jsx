import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import { uploadAvatar, deleteAvatar } from '../lib/avatar';
import { Plus, Trash2, Save, User, BookOpen, GraduationCap } from 'lucide-react';

export default function Profile({ profile, session, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [newGrade, setNewGrade] = useState({ subject_name: '', year: profile?.year || '', theory_grade: '', practical_grade: '' });

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    university: profile?.university || '',
    current_stage: profile?.current_stage || '',
    score_goal: profile?.score_goal || '',
  });

  useEffect(() => {
    fetchGrades();
  }, [session?.user?.id]);

  const fetchGrades = async () => {
    const { data } = await supabase.from('student_grades').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setGrades(data);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await supabase.from('profiles').update(form).eq('id', session.user.id);
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) { alert('خطأ: ' + err.message); } finally { setLoading(false); }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('student_grades').insert([{
        user_id: session.user.id,
        subject_name: newGrade.subject_name,
        year: parseInt(newGrade.year),
        theory_grade: parseFloat(newGrade.theory_grade) || 0,
        practical_grade: parseFloat(newGrade.practical_grade) || 0,
      }]);
      if (error) throw error;
      setNewGrade({ subject_name: '', year: profile?.year || '', theory_grade: '', practical_grade: '' });
      fetchGrades();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteGrade = async (id) => {
    if (!confirm('حذف هذه المادة؟')) return;
    await supabase.from('student_grades').delete().eq('id', id);
    fetchGrades();
  };

  const calculateAverage = () => {
    if (grades.length === 0) return 0;
    const total = grades.reduce((acc, curr) => acc + ((curr.theory_grade || 0) + (curr.practical_grade || 0)) / 2, 0);
    return (total / grades.length).toFixed(1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" dir="rtl">
      
      {/* Header Profile Card */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <Avatar profile={profile} size={90} editable={true} 
          onUpload={async (file) => { await uploadAvatar(session.user.id, file); if(onUpdate) onUpdate(); }}
          onDelete={async () => { await deleteAvatar(session.user.id); if(onUpdate) onUpdate(); }}
        />
        <div className="flex-1 text-center md:text-right">
          <h1 className="text-2xl font-bold text-content mb-1">{profile?.full_name || 'طالب جديد'}</h1>
          <p className="text-sm text-content-muted mb-2">{profile?.current_stage} — {profile?.university}</p>
          <p className="text-xs text-content-subtle">📧 {session?.user?.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="bg-surface-soft border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface transition-colors flex items-center gap-2">
            <User size={16} /> {editing ? 'إلغاء' : 'تعديل البيانات'}
          </button>
        </div>
      </div>

      {/* Editing Form */}
      {editing && (
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-content mb-4 flex items-center gap-2"><User size={18} /> تعديل المعلومات الأساسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="الاسم الكامل" className="bg-surface-soft border border-border rounded-lg px-3 py-2.5 text-sm" />
            <input type="text" value={form.university} onChange={e => setForm({...form, university: e.target.value})} placeholder="الجامعة" className="bg-surface-soft border border-border rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSaveProfile} disabled={loading} className="mt-4 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
            <Save size={16} /> حفظ التعديلات
          </button>
        </div>
      )}

      {/* Grades Section (Student Panel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Add Grade Form */}
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm md:col-span-1 h-fit">
          <h3 className="font-bold text-content mb-4 flex items-center gap-2"><Plus size={18} /> إضافة علامة مادة</h3>
          <form onSubmit={handleAddGrade} className="space-y-3">
            <input type="text" required placeholder="اسم المادة (مثال: تشريح)" value={newGrade.subject_name} onChange={e => setNewGrade({...newGrade, subject_name: e.target.value})} className="w-full bg-surface-soft border border-border rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" placeholder="علامة النظري" value={newGrade.theory_grade} onChange={e => setNewGrade({...newGrade, theory_grade: e.target.value})} className="w-full bg-surface-soft border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.1" placeholder="علامة العملي" value={newGrade.practical_grade} onChange={e => setNewGrade({...newGrade, practical_grade: e.target.value})} className="w-full bg-surface-soft border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary-light text-white py-2.5 rounded-lg font-semibold text-sm transition-colors">إضافة المادة</button>
          </form>
        </div>

        {/* Grades List & Average */}
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-content flex items-center gap-2"><GraduationCap size={18} /> سجلك الأكاديمي</h3>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold">
              المعدل: {calculateAverage()}%
            </div>
          </div>
          
          {grades.length === 0 ? (
            <div className="text-center py-10 text-content-muted text-sm border border-dashed border-border rounded-xl">لم تقم بإضافة أي علامات بعد.</div>
          ) : (
            <div className="space-y-2">
              {grades.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-surface-soft border border-border p-3 rounded-xl">
                  <div>
                    <div className="font-semibold text-content text-sm">{g.subject_name}</div>
                    <div className="text-xs text-content-muted mt-1">نظري: {g.theory_grade} | عملي: {g.practical_grade}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-lg text-primary">{((g.theory_grade + g.practical_grade) / 2).toFixed(1)}</div>
                    <button onClick={() => handleDeleteGrade(g.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}