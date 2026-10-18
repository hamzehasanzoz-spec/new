import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { extractText } from '../lib/fileExtractor';

export default function MyFiles({ session }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('فشل جلب الملفات:', error);
      return;
    }
    setDocuments(data || []);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError('');
    setFileInfo({ name: file.name, size: file.size });

    if (file.size > 15 * 1024 * 1024) {
      setError(`حجم الملف ${formatSize(file.size)} يتجاوز الحد الأقصى (15 ميجابايت).`);
      return;
    }

    setUploading(true);
    setUploadProgress('📖 قراءة الملف...');

    try {
      const text = await extractText(file);

      if (!text || text.trim().length < 50) {
        throw new Error('لم يتم العثور على نص كافٍ في هذا الملف. تأكد من أنه يحتوي على نص قابل للقراءة.');
      }

      const textSize = new Blob([text]).size;
      const textSizeMB = (textSize / (1024 * 1024)).toFixed(2);
      setUploadProgress(`✂️ استُخرج ${textSizeMB} MB نص. جاري توليد المتجهات...`);

      const { data: { session: freshSession }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !freshSession?.access_token) {
        throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول مجددًا.');
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession.access_token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          text,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
        }),
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const txt = await res.text();
          data = { error: txt.slice(0, 300) || `HTTP ${res.status}` };
        }
      } catch {
        data = { error: `HTTP ${res.status} (رد غير صالح)` };
      }

      if (!res.ok) {
        if (res.status === 413) throw new Error('📦 حجم البيانات كبير جدًا. جرّب ملفًا أصغر.');
        if (res.status === 401) throw new Error('🔒 انتهت الجلسة. سجّل الدخول مجددًا.');
        if (res.status === 500) throw new Error(`❌ خطأ في السيرفر: ${data.error || 'غير معروف'}`);
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setUploadProgress(`✅ تم الرفع بنجاح (${data.numChunks} جزء)`);
      setFileInfo(null);
      await loadDocuments();

      setTimeout(() => setUploadProgress(''), 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`حذف ملف "${doc.filename}"؟`)) return;
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) {
      alert('فشل الحذف: ' + error.message);
      return;
    }
    loadDocuments();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-content mb-2">
          📚 ملفاتي الدراسية
        </h1>
        <p className="text-sm text-content-muted">
          ارفع ملفات PDF أو TXT وسيستخدمها الذكاء الاصطناعي عند الإجابة على أسئلتك.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-surface-card border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <div className="text-5xl mb-4">📄</div>
        <h3 className="text-base font-bold text-content mb-1">
          ارفع ملفًا جديدًا
        </h3>
        <p className="text-xs text-content-muted mb-5">
          PDF أو TXT — الحد الأقصى 15 ميجابايت
        </p>

        <input
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload-input"
        />
        <label
          htmlFor="file-upload-input"
          className={`
            inline-flex items-center gap-2 px-8 py-3 rounded-md font-semibold text-sm transition-all cursor-pointer
            ${uploading
              ? 'bg-surface-soft text-content-muted cursor-not-allowed'
              : 'bg-primary hover:bg-primary-light text-white shadow-sm'
            }
          `}
        >
          {uploading ? '⏳ جاري المعالجة...' : '📁 اختر ملفًا'}
        </label>

        {/* File Info */}
        {fileInfo && uploading && (
          <div className="mt-5 bg-primary/5 border border-primary/20 rounded-md p-3 text-xs text-content-muted max-w-md mx-auto">
            <div className="font-semibold text-content">
              📎 {fileInfo.name}
            </div>
            <div className="mt-1">
              الحجم: {formatSize(fileInfo.size)}
            </div>
          </div>
        )}

        {/* Progress */}
        {uploadProgress && (
          <p className="mt-4 text-sm font-semibold text-primary">
            {uploadProgress}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 bg-danger/10 border border-danger/30 rounded-md p-3 text-sm text-danger text-right max-w-md mx-auto whitespace-pre-wrap">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Files List */}
      <div>
        <h2 className="text-sm font-bold text-content mb-3">
          📋 الملفات المرفوعة ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <div className="bg-surface-card border border-border rounded-lg p-12 text-center">
            <div className="text-4xl mb-3 opacity-40">📭</div>
            <p className="text-sm text-content-muted">لا توجد ملفات بعد.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-surface-card border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover:border-content-subtle transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-content truncate">
                    📄 {doc.filename}
                  </div>
                  <div className="text-xs text-content-muted mt-1 flex flex-wrap items-center gap-x-2">
                    {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                    {doc.num_chunks > 0 && <span>• {doc.num_chunks} جزء</span>}
                    <span>
                      • {new Date(doc.created_at).toLocaleDateString('ar-EG', {
                        day: 'numeric', month: 'long',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-danger hover:bg-danger/10 border border-danger/30 w-9 h-9 rounded-md flex items-center justify-center text-sm transition-colors"
                    title="حذف"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  if (status === 'approved') {
    return <span className="text-xs font-bold px-3 py-1 rounded-full bg-success/15 text-success">✅ معتمد</span>;
  }
  if (status === 'rejected') {
    return <span className="text-xs font-bold px-3 py-1 rounded-full bg-danger/15 text-danger">❌ مرفوض</span>;
  }
  // pending أو processing
  return <span className="text-xs font-bold px-3 py-1 rounded-full bg-warn/15 text-warn">⏳ قيد المراجعة</span>;
}