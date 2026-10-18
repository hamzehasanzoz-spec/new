import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | review | professors
  
  // الحالات الأساسية
  const [stats, setStats] = useState({ users: 0, waitlist: 0, documents: 0 });
  const [waitlist, setWaitlist] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // حالات المعاينة
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // حالات الدكاترة (الجديدة)
  const [professors, setProfessors] = useState([]);
  const [newProf, setNewProf] = useState({ name: '', faculty_slug: 'medicine', subject: '' });
  const [newStyle, setNewStyle] = useState({ professor_id: '', explanation_style: '', question_style: '', focus_areas: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. جلب الإحصائيات
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: waitlistCount } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });
      
      // 2. جلب الملفات قيد المراجعة
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      let docsWithProfiles = [];
      if (docsData && docsData.length > 0) {
        const userIds = [...new Set(docsData.map(d => d.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, faculty_name')
          .in('id', userIds);

        docsWithProfiles = docsData.map(doc => ({
          ...doc,
          profiles: profilesData?.find(p => p.id === doc.user_id) || { full_name: 'طالب غير معروف', faculty_name: 'غير محدد' }
        }));
      }

      // 3. جلب قائمة الانتظار
      const { data: waitlistData } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      // 4. جلب الدكاترة (الجديد)
      const { data: profsData } = await supabase
        .from('professors')
        .select('*, professor_styles(*)')
        .order('name');
      
      if (profsData) setProfessors(profsData);

      setStats({
        users: usersCount || 0,
        waitlist: waitlistCount || 0,
        documents: docsWithProfiles.length || 0,
      });
      setWaitlist(waitlistData || []);
      setPendingDocs(docsWithProfiles);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // دالة القبول والرفض للملفات
  const handleReview = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setPendingDocs(prev => prev.filter(doc => doc.id !== id));
      setStats(prev => ({ ...prev, documents: Math.max(0, prev.documents - 1) }));
      alert(`تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الملف بنجاح ✅`);
    } catch (err) {
      alert('فشل في تحديث الملف: ' + err.message);
    }
  };

  // دالة المعاينة
  const handlePreview = async (doc) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    setPreviewText('');
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('content')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true })
        .limit(500); 

      if (error) throw error;
      const fullText = data.map(c => c.content).join('\n\n');
      setPreviewText(fullText || 'لا يوجد نص متاح لهذا الملف.');
    } catch (err) {
      setPreviewText('حدث خطأ أثناء جلب النص: ' + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // دالة تحميل النص
  const downloadText = () => {
    if (!previewText) return;
    const element = document.createElement("a");
    const file = new Blob([previewText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `${previewDoc.filename}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // دوال إضافة الدكاترة (الجديدة)
  const handleAddProfessor = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('professors').insert([newProf]);
      if (error) throw error;
      alert('تم إضافة الدكتور بنجاح!');
      setNewProf({ name: '', faculty_slug: 'medicine', subject: '' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleAddStyle = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('professor_styles').insert([newStyle]);
      if (error) throw error;
      alert('تم حفظ أسلوب الدكتور بنجاح!');
      setNewStyle({ professor_id: '', explanation_style: '', question_style: '', focus_areas: '' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (loading) {
    return <div className="text-center py-20 text-content">جاري تحميل بيانات الإدارة...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      
      {/* Header & Tabs */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-content mb-4">لوحة تحكم الإدارة</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'overview' ? 'bg-primary text-white' : 'bg-surface-soft text-content-muted hover:text-content'}`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'review' ? 'bg-primary text-white' : 'bg-surface-soft text-content-muted hover:text-content'}`}
          >
            تدقيق الملفات
            {pendingDocs.length > 0 && (
              <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full">{pendingDocs.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('professors')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'professors' ? 'bg-primary text-white' : 'bg-surface-soft text-content-muted hover:text-content'}`}
          >
            إدارة الدكاترة
          </button>
        </div>
      </div>

      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-3xl font-bold text-primary mb-1">{stats.users}</div>
              <div className="text-sm text-content-muted">طالب مسجل</div>
            </div>
            <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-3xl font-bold text-warn mb-1">{stats.waitlist}</div>
              <div className="text-sm text-content-muted">في قائمة الانتظار</div>
            </div>
            <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-3xl font-bold text-danger mb-1">{stats.documents}</div>
              <div className="text-sm text-content-muted">ملف ينتظر التدقيق</div>
            </div>
          </div>

          <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-soft">
              <h2 className="font-bold text-content">قائمة الانتظار (Waitlist)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface text-content-muted border-b border-border">
                  <tr>
                    <th className="p-4 font-semibold">الاسم</th>
                    <th className="p-4 font-semibold">البريد الإلكتروني</th>
                    <th className="p-4 font-semibold">الكلية</th>
                    <th className="p-4 font-semibold">السنة</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((student) => (
                    <tr key={student.id} className="border-b border-border hover:bg-surface-soft transition-colors">
                      <td className="p-4 font-medium text-content">{student.full_name}</td>
                      <td className="p-4 text-content-muted" dir="ltr">{student.email}</td>
                      <td className="p-4 text-content-muted">{student.faculty_slug}</td>
                      <td className="p-4 text-content-muted">السنة {student.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. Review Tab */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {pendingDocs.length === 0 ? (
            <div className="bg-surface-card border border-border rounded-lg p-12 text-center text-content-muted">
              🎉 لا توجد ملفات قيد المراجعة حالياً. كل شيء محدث!
            </div>
          ) : (
            pendingDocs.map(doc => (
              <div key={doc.id} className="bg-surface-card border border-border rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-content text-lg mb-1">📄 {doc.filename}</div>
                  <div className="text-sm text-content-muted mb-2">
                    رفعه: {doc.profiles?.full_name || 'طالب غير معروف'} ({doc.profiles?.faculty_name})
                  </div>
                  <div className="text-xs text-content-subtle">
                    الحجم: {(doc.file_size / 1024).toFixed(1)} KB • نوع الملف: {doc.file_type}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <button
                    onClick={() => handlePreview(doc)}
                    className="bg-surface-soft border border-border text-content hover:border-content-subtle px-4 py-2 rounded-md text-sm font-semibold transition-colors"
                  >
                    🔍 معاينة النص
                  </button>
                  <button
                    onClick={() => handleReview(doc.id, 'approved')}
                    className="bg-success hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md text-sm transition-opacity"
                  >
                    ✅ قبول
                  </button>
                  <button
                    onClick={() => handleReview(doc.id, 'rejected')}
                    className="bg-danger hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md text-sm transition-opacity"
                  >
                    ❌ رفض
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Professors Tab (الجديد) */}
      {activeTab === 'professors' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* إضافة دكتور */}
          <div className="bg-surface-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-4 text-content">إضافة دكتور جديد</h2>
            <form onSubmit={handleAddProfessor} className="space-y-4">
              <input required placeholder="اسم الدكتور" value={newProf.name} onChange={e => setNewProf({...newProf, name: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content" />
              <select value={newProf.faculty_slug} onChange={e => setNewProf({...newProf, faculty_slug: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content">
                <option value="medicine">الطب البشري</option>
                <option value="dentistry">طب الأسنان</option>
                <option value="pharmacy">الصيدلة</option>
              </select>
              <input required placeholder="المادة التي يدرسها" value={newProf.subject} onChange={e => setNewProf({...newProf, subject: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content" />
              <button type="submit" className="bg-primary hover:bg-primary-light text-white w-full py-2 rounded-md font-bold text-sm transition-colors">إضافة الدكتور</button>
            </form>
          </div>

          {/* إضافة أسلوب */}
          <div className="bg-surface-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-4 text-content">إضافة أسلوب (شخصية) دكتور</h2>
            <form onSubmit={handleAddStyle} className="space-y-4">
              <select required value={newStyle.professor_id} onChange={e => setNewStyle({...newStyle, professor_id: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content">
                <option value="">اختر الدكتور...</option>
                {professors.map(p => <option key={p.id} value={p.id}>{p.name} - {p.subject}</option>)}
              </select>
              <textarea placeholder="طريقة الشرح (مثال: يعتمد على الجداول والمقارنات)" value={newStyle.explanation_style} onChange={e => setNewStyle({...newStyle, explanation_style: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content" rows="2" />
              <textarea placeholder="نمط الأسئلة (مثال: أسئلة تشخيص تفريقي وحالات سريرية)" value={newStyle.question_style} onChange={e => setNewStyle({...newStyle, question_style: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content" rows="2" />
              <textarea placeholder="نقاط التركيز (مثال: يركز كثيراً على الفارماكولوجي)" value={newStyle.focus_areas} onChange={e => setNewStyle({...newStyle, focus_areas: e.target.value})} className="w-full bg-surface-soft border border-border rounded-md px-3 py-2 text-sm text-content" rows="2" />
              <button type="submit" className="bg-success hover:opacity-90 text-white w-full py-2 rounded-md font-bold text-sm transition-opacity">حفظ الأسلوب</button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة المعاينة المنبثقة */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-content">معاينة: {previewDoc.filename}</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-content-muted hover:text-content text-xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-content text-sm leading-relaxed whitespace-pre-wrap">
              {loadingPreview ? (
                <div className="text-center py-10">جاري جلب النص...</div>
              ) : (
                previewText
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-between items-center gap-2">
               <button
                  onClick={downloadText}
                  className="bg-primary hover:bg-primary-light text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors"
                >
                  ⬇️ تحميل النص كاملاً (TXT)
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => { handleReview(previewDoc.id, 'approved'); setPreviewDoc(null); }}
                    className="bg-success hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md text-sm transition-opacity"
                  >
                    ✅ قبول
                  </button>
                  <button
                    onClick={() => { handleReview(previewDoc.id, 'rejected'); setPreviewDoc(null); }}
                    className="bg-danger hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md text-sm transition-opacity"
                  >
                    ❌ رفض
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}