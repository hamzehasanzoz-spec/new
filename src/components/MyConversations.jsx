import React, { useState, useEffect, useMemo } from 'react';
import {
  listConversationsWithCounts,
  deleteConversations,
  renameConversation,
} from '../lib/chatStorage';

export default function MyConversations({ session, onOpenConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listConversationsWithCounts(userId);
      setConversations(data);
    } catch (err) {
      console.error('فشل التحميل:', err);
    } finally {
      setLoading(false);
    }
  };

  // تصفية حسب البحث
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter(c =>
      c.title?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // تصنيف حسب التاريخ
  const grouped = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 7 * 86400000;

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    filtered.forEach(c => {
      const d = new Date(c.updated_at);
      d.setHours(0, 0, 0, 0);
      const t = d.getTime();

      if (t >= today) groups.today.push(c);
      else if (t >= yesterday) groups.yesterday.push(c);
      else if (t >= lastWeek) groups.lastWeek.push(c);
      else groups.older.push(c);
    });

    return groups;
  }, [filtered]);

  // تحديد / إلغاء تحديد
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`حذف ${selectedIds.length} محادثة؟ لا يمكن التراجع.`)) return;

    try {
      await deleteConversations(selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
      loadData();
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذه المحادثة؟')) return;
    try {
      await deleteConversations([id]);
      loadData();
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  const handleRename = async (id, currentTitle) => {
    const newTitle = prompt('العنوان الجديد:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await renameConversation(id, newTitle.trim());
      loadData();
    } catch (err) {
      alert('فشل التعديل: ' + err.message);
    }
  };

  const handleOpen = (id) => {
    if (selectionMode) {
      toggleSelect(id);
    } else if (onOpenConversation) {
      onOpenConversation(id);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // إحصائيات
  const totalMessages = conversations.reduce((acc, c) => acc + (c.message_count || 0), 0);

  // ═══ Render ═══
  return (
    <div style={{
      maxWidth: 1000,
      margin: '20px auto',
      padding: 0,
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2A5C82 0%, #3B7BA8 100%)',
        color: '#fff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.5em', fontWeight: 800 }}>
              📂 محادثاتي
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9em' }}>
              {conversations.length} محادثة • {totalMessages} رسالة
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                disabled={conversations.length === 0}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: conversations.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85em',
                  fontFamily: 'inherit',
                }}
              >
                ☑️ تحديد
              </button>
            ) : (
              <>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85em',
                    fontFamily: 'inherit',
                  }}
                >
                  {selectedIds.length === filtered.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <button
                  onClick={() => { setSelectionMode(false); setSelectedIds([]); }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85em',
                    fontFamily: 'inherit',
                  }}
                >
                  إلغاء
                </button>
              </>
            )}
          </div>
        </div>

        {/* شريط البحث */}
        <div style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder="🔍 ابحث في المحادثات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: 'none',
              fontSize: '0.95em',
              fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.95)',
              color: '#1E293B',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* شريط الحذف المتعدد */}
        {selectionMode && selectedIds.length > 0 && (
          <div style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(239,68,68,0.15)',
            padding: '8px 16px',
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.4)',
          }}>
            <span style={{ fontSize: '0.85em', fontWeight: 600 }}>
              {selectedIds.length} محادثة محددة
            </span>
            <button
              onClick={handleBulkDelete}
              style={{
                background: '#EF4444',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82em',
                fontFamily: 'inherit',
              }}
            >
              🗑 حذف المحدد
            </button>
          </div>
        )}
      </div>

      {/* قائمة المحادثات */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          جاري التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 60,
          textAlign: 'center',
          color: 'var(--text-subtle)',
        }}>
          <div style={{ fontSize: '3em', marginBottom: 12 }}>💬</div>
          {search ? (
            <>
              <div>لا توجد نتائج لـ "{search}"</div>
              <div style={{ fontSize: '0.85em', marginTop: 8 }}>
                جرّب كلمة أخرى
              </div>
            </>
          ) : (
            <>
              <div>لا توجد محادثات بعد</div>
              <div style={{ fontSize: '0.85em', marginTop: 8 }}>
                ابدأ من صفحة الدردشة الذكية
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          {grouped.today.length > 0 && (
            <ConversationGroup
              title="📌 اليوم"
              conversations={grouped.today}
              formatDate={formatDate}
              selectedIds={selectedIds}
              selectionMode={selectionMode}
              onToggle={toggleSelect}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
          {grouped.yesterday.length > 0 && (
            <ConversationGroup
              title="🕐 الأمس"
              conversations={grouped.yesterday}
              formatDate={formatDate}
              selectedIds={selectedIds}
              selectionMode={selectionMode}
              onToggle={toggleSelect}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
          {grouped.lastWeek.length > 0 && (
            <ConversationGroup
              title="📅 آخر 7 أيام"
              conversations={grouped.lastWeek}
              formatDate={formatDate}
              selectedIds={selectedIds}
              selectionMode={selectionMode}
              onToggle={toggleSelect}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
          {grouped.older.length > 0 && (
            <ConversationGroup
              title="📚 أقدم"
              conversations={grouped.older}
              formatDate={formatDate}
              selectedIds={selectedIds}
              selectionMode={selectionMode}
              onToggle={toggleSelect}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// مجموعة محادثات (Today / Yesterday / ...)
// ═══════════════════════════════════════
function ConversationGroup({
  title, conversations, formatDate, selectedIds, selectionMode,
  onToggle, onOpen, onDelete, onRename,
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        color: 'var(--text-muted)',
        fontSize: '0.85em',
        fontWeight: 700,
        margin: '0 0 10px',
        paddingRight: 4,
      }}>
        {title} ({conversations.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversations.map(conv => {
          const isSelected = selectedIds.includes(conv.id);
          return (
            <div
              key={conv.id}
              style={{
                background: isSelected ? 'rgba(42,92,130,0.08)' : 'var(--bg-elevated)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => onOpen(conv.id)}
            >
              {/* Checkbox للتحديد */}
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(conv.id)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                    accentColor: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
              )}

              {/* أيقونة */}
              <div style={{
                fontSize: '1.4em',
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                💬
              </div>

              {/* المحتوى */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontSize: '0.95em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 4,
                }}>
                  {conv.title}
                </div>
                <div style={{
                  fontSize: '0.78em',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <span>📝 {conv.message_count} رسالة</span>
                  <span>🕐 {formatDate(conv.updated_at)}</span>
                </div>
              </div>

              {/* أزرار التحكم */}
              {!selectionMode && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(conv.id, conv.title); }}
                    title="تعديل العنوان"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.85em',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    title="حذف"
                    style={{
                      background: 'transparent',
                      border: '1px solid #FECACA',
                      color: '#EF4444',
                      padding: '6px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.85em',
                    }}
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}