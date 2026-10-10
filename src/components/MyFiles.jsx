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

    // تحذير مبكر إذا كان الملف ضخمًا
    if (file.size > 15 * 1024 * 1024) {
      setError(`حجم الملف ${formatSize(file.size)} يتجاوز الحد الأقصى (15 ميجابايت).`);
      return;
    }

    setUploading(true);
    setUploadProgress('📖 قراءة الملف...');

    try {
      // 1. استخراج النص من الملف
      const text = await extractText(file);

      if (!text || text.trim().length < 50) {
        throw new Error('لم يتم العثور على نص كافٍ في هذا الملف. تأكد من أنه يحتوي على نص قابل للقراءة (ليس صورة ممسوحة ضوئيًا).');
      }

      const textSize = new Blob([text]).size;
      const textSizeMB = (textSize / (1024 * 1024)).toFixed(2);
      setUploadProgress(`✂️ استُخرج ${textSizeMB} MB نص. جاري توليد المتجهات...`);

      // 2. التأكد من الجلسة الحالية
      const { data: { session: freshSession }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !freshSession?.access_token) {
        throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول مجددًا.');
      }

      // 3. إرسال إلى API
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

      // 4. معالجة الرد (JSON أو نص)
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
        // معالجة خاصة للأخطاء الشائعة
        if (res.status === 413) {
          throw new Error(
            '📦 حجم البيانات كبير جدًا. جرّب ملفًا أصغر أو قسّمه إلى أجزاء.'
          );
        }
        if (res.status === 401) {
          throw new Error('🔒 انتهت الجلسة. سجّل الدخول مجددًا.');
        }
        if (res.status === 500) {
          throw new Error(`❌ خطأ في السيرفر: ${data.error || 'غير معروف'}`);
        }
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
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);
    if (error) {
      alert('فشل الحذف: ' + error.message);
      return;
    }
    loadDocuments();
  };

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 25, direction: 'rtl', textAlign: 'right' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff', padding: 30, borderRadius: 16, marginBottom: 25,
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.5em' }}>📚 ملفاتي الدراسية</h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95em' }}>
          ارفع ملفات PDF أو TXT وسيستخدمها الذكاء الاصطناعي عند الإجابة على أسئلتك.
        </p>
      </div>

      {/* Upload Zone */}
      <div style={{
        background: '#fff', padding: 30, borderRadius: 14,
        border: '2px dashed #CBD5E1', textAlign: 'center', marginBottom: 25,
      }}>
        <div style={{ fontSize: '3em', marginBottom: 10 }}>📄</div>
        <h3 style={{ color: '#2A5C82', marginTop: 0 }}>ارفع ملفًا جديدًا</h3>
        <p style={{ color: '#64748B', fontSize: '0.9em' }}>
          PDF أو TXT — الحد الأقصى 15 ميجابايت
        </p>

        <input
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
        <label
          htmlFor="file-upload-input"
          style={{
            display: 'inline-block',
            background: uploading ? '#94A3B8' : '#2A5C82',
            color: '#fff', padding: '12px 32px', borderRadius: 8,
            fontWeight: 'bold',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginTop: 12,
          }}
        >
          {uploading ? '⏳ جاري المعالجة...' : '📁 اختر ملفًا'}
        </label>

        {/* معلومات الملف الحالي */}
        {fileInfo && uploading && (
          <div style={{
            marginTop: 16,
            padding: '10px 16px',
            background: '#EFF6FF',
            borderRadius: 8,
            fontSize: '0.85em',
            color: '#2A5C82',
          }}>
            <div>📎 <strong>{fileInfo.name}</strong></div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              الحجم: {formatSize(fileInfo.size)}
            </div>
          </div>
        )}

        {uploadProgress && (
          <p style={{ marginTop: 16, color: '#2A5C82', fontWeight: 'bold', fontSize: '0.9em' }}>
            {uploadProgress}
          </p>
        )}

        {error && (
          <div style={{
            marginTop: 16, color: '#991B1B', background: '#FEF2F2',
            padding: '12px 16px', borderRadius: 8, fontSize: '0.88em',
            border: '1px solid #FECACA',
            textAlign: 'right',
            whiteSpace: 'pre-wrap',
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Files List */}
      <h2 style={{ color: '#2A5C82', fontSize: '1.2em' }}>
        📋 الملفات المرفوعة ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <div style={{
          background: '#fff', padding: 40, borderRadius: 14,
          border: '1px solid #E2E8F0', textAlign: 'center', color: '#94A3B8',
        }}>
          لا توجد ملفات بعد.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {documents.map(doc => (
            <div key={doc.id} style={{
              background: '#fff', padding: 16, borderRadius: 12,
              border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 'bold', color: '#1E293B',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  📄 {doc.filename}
                </div>
                <div style={{ fontSize: '0.8em', color: '#64748B', marginTop: 4 }}>
                  {doc.file_size ? `${formatSize(doc.file_size)} • ` : ''}
                  {doc.num_chunks > 0 && `${doc.num_chunks} جزء • `}
                  {new Date(doc.created_at).toLocaleDateString('ar-EG', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 99,
                  fontSize: '0.78em', fontWeight: 'bold',
                  background: doc.status === 'ready' ? '#D1FAE5'
                    : doc.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                  color: doc.status === 'ready' ? '#065F46'
                    : doc.status === 'failed' ? '#991B1B' : '#92400E',
                }}>
                  {doc.status === 'ready' ? '✅ جاهز'
                    : doc.status === 'failed' ? '❌ فشل' : '⏳ قيد المعالجة'}
                </span>

                <button
                  onClick={() => handleDelete(doc)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #EF4444', color: '#EF4444',
                    padding: '6px 12px', borderRadius: 6,
                    cursor: 'pointer', fontSize: '0.85em',
                  }}
                >
                  🗑 حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}