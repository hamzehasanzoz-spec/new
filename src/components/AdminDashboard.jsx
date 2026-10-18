import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | review
  const [stats, setStats] = useState({ users: 0, waitlist: 0, documents: 0 });
  const [waitlist, setWaitlist] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

   const fetchData = async () => {
    setLoading(true);
    try {
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: waitlistCount } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });
      
      // 1. جلب الملفات قيد المراجعة
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      }

      // 2. جلب أسماء الطلاب الذين رفعوا هذه الملفات (لضمان عدم فشل الاستعلام)
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

      const { data: waitlistData } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

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

  if (loading) {
    return <div className="text-center py-20 text-content">جاري تحميل بيانات الإدارة...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      
      {/* Header & Tabs */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-content mb-4">لوحة تحكم الإدارة</h1>
        <div className="flex gap-2">
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
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
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

          {/* Waitlist Table */}
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
                    التاريخ: {new Date(doc.created_at).toLocaleString('ar-EG')} • الحجم: {(doc.file_size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
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
    </div>
  );
}