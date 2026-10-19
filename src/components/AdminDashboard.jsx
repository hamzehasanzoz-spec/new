import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); 
  
  // الحالات الأساسية
  const [stats, setStats] = useState({ users: 0, waitlist: 0, documents: 0 });
  const [waitlist, setWaitlist] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // حالات الجداول
  const [allUsers, setAllUsers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [professors, setProfessors] = useState([]);

  // حالة تبويب المواد (الجديدة)
  const [selectedFacultyTab, setSelectedFacultyTab] = useState('medicine');

  // حالات المعاينة
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // حالات الدكاترة
  const [newProf, setNewProf] = useState({ name: '', faculty_slug: 'medicine', subject: '' });
  const [newStyle, setNewStyle] = useState({ professor_id: '', explanation_style: '', question_style: '', focus_areas: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. الإحصائيات
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: waitlistCount } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });
      
      // 2. قائمة الانتظار
      const { data: waitlistData } = await supabase.from('waitlist').select('*').order('created_at', { ascending: false });

      // 3. الملفات قيد المراجعة
      const { data: docsData } = await supabase.from('documents').select('*').eq('status', 'pending').order('created_at', { ascending: false });

      let docsWithProfiles = [];
      if (docsData && docsData.length > 0) {
        const userIds = [...new Set(docsData.map(d => d.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, faculty_name').in('id', userIds);
        docsWithProfiles = docsData.map(doc => ({
          ...doc,
          profiles: profilesData?.find(p => p.id === doc.user_id) || { full_name: 'طالب غير معروف', faculty_name: 'غير محدد' }
        }));
      }

      // 4. الجداول الجديدة
      const { data: allUsersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const { data: subjectsData } = await supabase.from('subjects').select('*').order('year');
      const { data: allDocsData } = await supabase.from('documents').select('*, profiles(full_name)').order('created_at', { ascending: false });
      const { data: profsData } = await supabase.from('professors').select('*, professor_styles(*)').order('name');

      setStats({
        users: usersCount || 0,
        waitlist: waitlistCount || 0,
        documents: docsWithProfiles.length || 0,
      });
      
      setWaitlist(waitlistData || []);
      setPendingDocs(docsWithProfiles);
      setAllUsers(allUsersData || []);
      setAllSubjects(subjectsData || []);
      setAllDocs(allDocsData || []);
      if (profsData) setProfessors(profsData);

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('documents').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setPendingDocs(prev => prev.filter(doc => doc.id !== id));
      setStats(prev => ({ ...prev, documents: Math.max(0, prev.documents - 1) }));
      alert(`تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الملف بنجاح ✅`);
      fetchData(); 
    } catch (err) {
      alert('فشل في تحديث الملف: ' + err.message);
    }
  };

  const handlePreview = async (doc) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    setPreviewText('');
    try {
      const { data, error } = await supabase.from('document_chunks').select('content').eq('document_id', doc.id).order('chunk_index', { ascending: true }).limit(500); 
      if (error) throw error;
      setPreviewText(data.map(c => c.content).join('\n\n') || 'لا يوجد نص متاح.');
    } catch (err) {
      setPreviewText('حدث خطأ أثناء جلب النص: ' + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('professors').insert([newProf]);
      if (error) throw error;
      alert('تم إضافة الدكتور بنجاح!'); setNewProf({ name: '', faculty_slug: 'medicine', subject: '' }); fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleAddStyle = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('professor_styles').insert([newStyle]);
      if (error) throw error;
      alert('تم حفظ أسلوب الدكتور بنجاح!'); setNewStyle({ professor_id: '', explanation_style: '', question_style: '', focus_areas: '' }); fetchData();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="text-center py-20 text-content">جاري تحميل بيانات الإدارة...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6" dir="rtl">
      
      {/* التبويبات الرئيسية */}
      <div className="bg-surface-card border border-border rounded-lg p-4 flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'النظرة العامة' },
          { id: 'students', label: 'الطلاب' },
          { id: 'subjects', label: 'المواد' },
          { id: 'files', label: 'كل الملفات' },
          { id: 'professors', label: 'الدكاترة' },
          { id: 'review', label: 'طلبات التدقيق' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-surface-soft text-content-muted hover:text-content'}`}
          >
            {tab.label}
            {tab.id === 'review' && pendingDocs.length > 0 && (
              <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full mr-2">{pendingDocs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* 1. نظرة عامة */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.users}</div>
            <div className="text-sm text-content-muted">طالب مسجل</div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-warn mb-1">{stats.waitlist}</div>
            <div className="text-sm text-content-muted">في قائمة الانتظار</div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-danger mb-1">{stats.documents}</div>
            <div className="text-sm text-content-muted">ملف ينتظر التدقيق</div>
          </div>
        </div>
      )}

      {/* 2. الطلاب */}
      {activeTab === 'students' && (
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-soft text-content-muted border-b border-border">
              <tr><th className="p-4">الاسم</th><th className="p-4">الإيميل</th><th className="p-4">الكلية</th><th className="p-4">الصلاحية</th><th className="p-4">إجراء</th></tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} className="border-b border-border">
                  <td className="p-4 font-medium">{u.full_name || 'غير مكتمل'}</td>
                  <td className="p-4" dir="ltr">{u.email}</td>
                  <td className="p-4">{u.faculty_name || 'غير محدد'}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-soft text-content'}`}>{u.role}</span></td>
                  <td className="p-4"><button className="text-primary hover:underline text-xs">تعديل</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

            {/* 3. المواد */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          {/* التبويبات الفرعية للكليات */}
          <div className="flex gap-2 flex-wrap bg-surface-soft p-2 rounded-lg border border-border">
            {[
              { id: 'medicine', label: 'الطب البشري' },
              { id: 'dentistry', label: 'طب الأسنان' },
              { id: 'pharmacy', label: 'الصيدلة' },
              { id: 'step', label: 'مسار STEP' }
            ].map(fac => (
              <button
                key={fac.id}
                onClick={() => setSelectedFacultyTab(fac.id)}
                className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${selectedFacultyTab === fac.id ? 'bg-primary text-white' : 'text-content-muted hover:text-content'}`}
              >
                {fac.label}
              </button>
            ))}
          </div>

          {/* جدول المواد المعروضة */}
          <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-soft text-content-muted border-b border-border">
                <tr>
                  <th className="p-4">اسم المادة</th>
                  <th className="p-4">السنة الدراسية</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {allSubjects
                  .filter(s => s.faculty_slug === selectedFacultyTab)
                  .map(s => (
                  <tr key={s.id} className="border-b border-border hover:bg-surface-soft">
                    <td className="p-4 font-medium text-content">{s.name}</td>
                    <td className="p-4 text-content-muted">السنة {s.year}</td>
                    <td className="p-4 flex gap-2">
                      <button className="bg-surface-soft border border-border text-content px-3 py-1 rounded text-xs hover:border-content-subtle">رؤية الملفات</button>
                      <button onClick={() => alert('ميزة التعديل ستتوفر قريباً!')} className="text-primary hover:underline text-xs">تعديل</button>
                    </td>
                  </tr>
                ))}
                {allSubjects.filter(s => s.faculty_slug === selectedFacultyTab).length === 0 && (
                  <tr><td colSpan="3" className="p-8 text-center text-content-subtle">لا توجد مواد مضافة لهذه الكلية بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. كل الملفات */}
      {activeTab === 'files' && (
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-soft text-content-muted border-b border-border">
              <tr><th className="p-4">اسم الملف</th><th className="p-4">الطالب</th><th className="p-4">الحالة</th><th className="p-4">إجراء</th></tr>
            </thead>
            <tbody>
              {allDocs.map(d => (
                <tr key={d.id} className="border-b border-border">
                  <td className="p-4 font-medium">{d.filename}</td>
                  <td className="p-4">{d.profiles?.full_name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${d.status === 'approved' ? 'bg-success/20 text-success' : d.status === 'rejected' ? 'bg-danger/20 text-danger' : 'bg-warn/20 text-warn'}`}>{d.status}</span>
                  </td>
                  <td className="p-4"><button onClick={() => handlePreview(d)} className="text-primary hover:underline text-xs">معاينة</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. الدكاترة */}
      {activeTab === 'professors' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-4">إضافة دكتور جديد</h2>
            <form onSubmit={handleAddProfessor} className="space-y-4">
              <input required placeholder="اسم الدكتور" value={newProf.name} onChange={e => setNewProf({...newProf, name: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm" />
              <select value={newProf.faculty_slug} onChange={e => setNewProf({...newProf, faculty_slug: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm">
                <option value="medicine">الطب البشري</option><option value="dentistry">طب الأسنان</option><option value="pharmacy">الصيدلة</option>
              </select>
              <input required placeholder="المادة" value={newProf.subject} onChange={e => setNewProf({...newProf, subject: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm" />
              <button type="submit" className="bg-primary text-white w-full py-2 rounded-md font-bold text-sm">إضافة</button>
            </form>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-4">إضافة أسلوب دكتور</h2>
            <form onSubmit={handleAddStyle} className="space-y-4">
              <select required value={newStyle.professor_id} onChange={e => setNewStyle({...newStyle, professor_id: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm">
                <option value="">اختر الدكتور...</option>
                {professors.map(p => <option key={p.id} value={p.id}>{p.name} - {p.subject}</option>)}
              </select>
              <textarea placeholder="طريقة الشرح" value={newStyle.explanation_style} onChange={e => setNewStyle({...newStyle, explanation_style: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm" rows="1" />
              <textarea placeholder="نمط الأسئلة" value={newStyle.question_style} onChange={e => setNewStyle({...newStyle, question_style: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm" rows="1" />
              <textarea placeholder="نقاط التركيز" value={newStyle.focus_areas} onChange={e => setNewStyle({...newStyle, focus_areas: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm" rows="1" />
              <button type="submit" className="bg-success text-white w-full py-2 rounded-md font-bold text-sm">حفظ</button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-surface-card border border-border rounded-lg p-6">
             <h2 className="font-bold text-lg mb-4">قائمة الدكاترة</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professors.map(p => (
                  <div key={p.id} className="bg-surface-soft border border-border rounded p-4 flex justify-between items-center">
                     <div>
                       <div className="font-bold text-content">{p.name}</div>
                       <div className="text-xs text-content-muted">{p.subject} - {p.faculty_slug}</div>
                     </div>
                     <button className="text-primary hover:underline text-xs">تعديل</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* 6. طلبات التدقيق */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {pendingDocs.length === 0 ? <div className="p-12 text-center text-content-muted bg-surface-card border border-border rounded-lg">🎉 لا توجد ملفات للتدقيق</div> : 
            pendingDocs.map(doc => (
              <div key={doc.id} className="bg-surface-card border border-border rounded-lg p-5 flex justify-between items-center gap-4">
                <div>
                  <div className="font-bold text-lg">📄 {doc.filename}</div>
                  <div className="text-sm text-content-muted">رفعه: {doc.profiles?.full_name}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePreview(doc)} className="bg-surface-soft border border-border px-4 py-2 rounded-md text-sm font-semibold">🔍 معاينة</button>
                  <button onClick={() => handleReview(doc.id, 'approved')} className="bg-success text-white px-4 py-2 rounded-md text-sm font-semibold">✅ قبول</button>
                  <button onClick={() => handleReview(doc.id, 'rejected')} className="bg-danger text-white px-4 py-2 rounded-md text-sm font-semibold">❌ رفض</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* نافذة المعاينة */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">معاينة: {previewDoc.filename}</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-xl">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm whitespace-pre-wrap">{loadingPreview ? 'جاري التحميل...' : previewText}</div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
               <button onClick={() => { handleReview(previewDoc.id, 'approved'); setPreviewDoc(null); }} className="bg-success text-white px-4 py-2 rounded-md">قبول</button>
               <button onClick={() => { handleReview(previewDoc.id, 'rejected'); setPreviewDoc(null); }} className="bg-danger text-white px-4 py-2 rounded-md">رفض</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}