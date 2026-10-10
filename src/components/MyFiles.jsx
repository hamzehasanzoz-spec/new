import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { extractText } from '../lib/fileExtractor';

export default function MyFiles({ session }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // تحقق من الحجم
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الملف يتجاوز 10 ميجابايت');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress('📖 قراءة الملف...');

    try {
      // 1. استخراج النص
      const text = await extractText(file);

      if (!text || text.trim().length < 50) {
        throw new Error('لم يتم العثور على نص كافٍ في الملف');
      }

      setUploadProgress(`✂️ جاري تقطيع النص وتوليد المتجهات...`);

      // 2. الحصول على access token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;
      if (!accessToken) throw new Error('انتهت الجلسة، سجّل الدخول مجددًا');

      // 3. إرسال إلى /api/upload
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          text,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          accessToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setUploadProgress(`✅ تم الرفع (${data.numChunks} جزء)`);
      await loadDocuments();

      setTimeout(() => setUploadProgress(''), 2500);

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

      {/* Upload zone */}
      <div style={{
        background: '#fff',
        padding: 30,
        borderRadius: 14,
        border: '2px dashed #CBD5E1',
        textAlign: 'center',
        marginBottom: 25,
      }}>
        <div style={{ fontSize: '3em', marginBottom: 10 }}>📄</div>
        <h3 style={{ color: '#2A5C82', marginTop: 0 }}>ارفع ملفًا جديدًا</h3>
        <p style={{ color: '#64748B', fontSize: '0.9em' }}>
          PDF أو TXT — الحد الأقصى 10 ميجابايت
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
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginTop: 12,
          }}
        >
          {uploading ? 'جاري الرفع...' : '📁 اختر ملفًا'}
        </label>

        {uploadProgress && (
          <p style={{ marginTop: 16, color: '#2A5C82', fontWeight: 'bold', fontSize: '0.9em' }}>
            {uploadProgress}
          </p>
        )}
        {error && (
          <p style={{
            marginTop: 16,
            color: '#EF4444',
            background: '#FEF2F2',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '0.88em',
          }}>
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Files list */}
      <h2 style={{ color: '#2A5C82', fontSize: '1.2em' }}>
        📋 الملفات المرفوعة ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <div style={{
          background: '#fff', padding: 40, borderRadius: 14,
          border: '1px solid #E2E8F0', textAlign: 'center', color: '#94A3B8',
        }}>
          لا توجد ملفات بعد. ارفع ملفك الأول ليبدأ الذكاء الاصطناعي بالاستفادة منه.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {documents.map(doc => (
            <div
              key={doc.id}
              style={{
                background: '#fff',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 'bold', color: '#1E293B',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  📄 {doc.filename}
                </div>
                <div style={{ fontSize: '0.8em', color: '#64748B', marginTop: 4 }}>
                  {doc.num_chunks > 0 && `${doc.num_chunks} جزء • `}
                  {new Date(doc.created_at).toLocaleDateString('ar-EG', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 99,
                  fontSize: '0.78em',
                  fontWeight: 'bold',
                  background: doc.status === 'ready' ? '#D1FAE5' : doc.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                  color: doc.status === 'ready' ? '#065F46' : doc.status === 'failed' ? '#991B1B' : '#92400E',
                }}>
                  {doc.status === 'ready' ? '✅ جاهز' : doc.status === 'failed' ? '❌ فشل' : '⏳ قيد المعالجة'}
                </span>

                <button
                  onClick={() => handleDelete(doc)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #EF4444',
                    color: '#EF4444',
                    padding: '6px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.85em',
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