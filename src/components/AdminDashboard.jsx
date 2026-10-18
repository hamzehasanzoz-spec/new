import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, waitlist: 0, documents: 0 });
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب الإحصائيات
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: waitlistCount } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });
      const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });

      setStats({
        users: usersCount || 0,
        waitlist: waitlistCount || 0,
        documents: docsCount || 0,
      });

      // جلب قائمة الانتظار
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (waitlistData) setWaitlist(waitlistData);
      
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
      
      {/* Header */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-content mb-2">لوحة تحكم الإدارة (Admin)</h1>
        <p className="text-sm text-content-muted">إدارة المنصة، مراجعة الطلاب، والإحصائيات العامة.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-3xl font-bold text-primary mb-1">{stats.users}</div>
          <div className="text-sm text-content-muted">طالب مسجل في المنصة</div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-3xl font-bold text-warn mb-1">{stats.waitlist}</div>
          <div className="text-sm text-content-muted">في قائمة الانتظار (Waitlist)</div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-3xl font-bold text-success mb-1">{stats.documents}</div>
          <div className="text-sm text-content-muted">ملف مرفوع من الطلاب</div>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-soft">
          <h2 className="font-bold text-content">قائمة الانتظار (Waitlist) - {waitlist.length} طالب</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface text-content-muted border-b border-border">
              <tr>
                <th className="p-4 font-semibold">الاسم</th>
                <th className="p-4 font-semibold">البريد الإلكتروني</th>
                <th className="p-4 font-semibold">الكلية</th>
                <th className="p-4 font-semibold">السنة</th>
                <th className="p-4 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-content-subtle">لا يوجد طلاب في قائمة الانتظار بعد.</td></tr>
              ) : (
                waitlist.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-surface-soft transition-colors">
                    <td className="p-4 font-medium text-content">{student.full_name}</td>
                    <td className="p-4 text-content-muted" dir="ltr">{student.email}</td>
                    <td className="p-4 text-content-muted">{student.faculty_slug}</td>
                    <td className="p-4 text-content-muted">السنة {student.year}</td>
                    <td className="p-4 text-content-subtle">
                      {new Date(student.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}