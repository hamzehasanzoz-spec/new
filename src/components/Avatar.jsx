import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Avatar({ 
  profile, 
  size = 40, 
  editable = false, 
  onUpload,
  onDelete,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  const avatarUrl = profile?.avatar_url;
  const fullName = profile?.full_name || '';
  const initial = fullName.trim().charAt(0).toUpperCase() || '؟';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('حذف الصورة الرمزية؟')) return;
    setError('');
    setUploading(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const avatarContent = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={fullName || 'avatar'}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
      }}
    />
  ) : (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.45,
      fontWeight: 800,
      color: '#fff',
    }}>
      {initial}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: avatarUrl 
            ? 'transparent'
            : 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '2px solid var(--border)',
          opacity: uploading ? 0.6 : 1,
        }}>
          {avatarContent}
        </div>

        {uploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.4,
          }}>
            ⏳
          </div>
        )}
      </div>

      {editable && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
            id={`avatar-input-${profile?.id || 'default'}`}
          />
          <label
            htmlFor={`avatar-input-${profile?.id || 'default'}`}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '0.8em',
              fontWeight: 600,
              fontFamily: 'inherit',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? '...' : '📷 رفع صورة'}
          </label>

          {avatarUrl && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              style={{
                background: 'transparent',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '6px 12px',
                borderRadius: 8,
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.8em',
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              🗑 حذف
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{
          fontSize: '0.78em',
          color: '#EF4444',
          textAlign: 'center',
          maxWidth: 200,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}