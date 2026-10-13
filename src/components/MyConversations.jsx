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

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter(c => c.title?.toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 7 * 86400000;

    const groups = { today: [], yesterday: [], lastWeek: [], older: [] };

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

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(c => c.id));
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
    if (selectionMode) toggleSelect(id);
    else if (onOpenConversation) onOpenConversation(id);
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalMessages = conversations.reduce((acc, c) => acc + (c.message_count || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="bg-surface-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-content mb-1">
              📂 محادثاتي
            </h1>
            <p className="text-sm text-content-muted">
              {conversations.length} محادثة • {totalMessages} رسالة
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                disabled={conversations.length === 0}
                className="text-xs bg-surface-soft border border-border text-content-muted hover:text-content px-4 py-2 rounded-md font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ☑️ تحديد
              </button>
            ) : (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs bg-surface-soft border border-border text-content-muted hover:text-content px-4 py-2 rounded-md font-semibold transition-colors"
                >
                  {selectedIds.length === filtered.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <button
                  onClick={() => { setSelectionMode(false); setSelectedIds([]); }}
                  className="text-xs bg-surface-soft border border-border text-content-muted hover:text-content px-4 py-2 rounded-md font-semibold transition-colors"
                >
                  إلغاء
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 ابحث في المحادثات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface-soft border border-border rounded-md px-4 py-2.5 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />

        {/* Bulk Actions */}
        {selectionMode && selectedIds.length > 0 && (
          <div className="bg-danger/10 border border-danger/30 rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-semibold text-danger">
              {selectedIds.length} محادثة محددة
            </span>
            <button
              onClick={handleBulkDelete}
              className="bg-danger hover:opacity-90 text-white font-semibold px-4 py-2 rounded-md text-xs transition-opacity"
            >
              🗑 حذف المحدد
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 mx-auto border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-content-muted mt-4">جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-card border border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">💬</div>
          {search ? (
            <>
              <div className="text-sm text-content-muted mb-1">
                لا توجد نتائج لـ "{search}"
              </div>
              <div className="text-xs text-content-subtle">جرّب كلمة أخرى</div>
            </>
          ) : (
            <>
              <div className="text-sm text-content-muted mb-1">لا توجد محادثات بعد</div>
              <div className="text-xs text-content-subtle">ابدأ من صفحة الدردشة الذكية</div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
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
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// مجموعة محادثات
// ═══════════════════════════════════════
function ConversationGroup({
  title, conversations, formatDate, selectedIds, selectionMode,
  onToggle, onOpen, onDelete, onRename,
}) {
  if (conversations.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-bold text-content-subtle uppercase tracking-wider mb-2 px-1">
        {title} ({conversations.length})
      </h3>

      <div className="space-y-2">
        {conversations.map(conv => {
          const isSelected = selectedIds.includes(conv.id);
          return (
            <div
              key={conv.id}
              onClick={() => onOpen(conv.id)}
              className={`
                bg-surface-card rounded-lg p-4 flex items-center gap-3 cursor-pointer transition-all border
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-content-subtle'
                }
              `}
            >
              {/* Checkbox */}
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(conv.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-5 h-5 accent-primary cursor-pointer flex-shrink-0"
                />
              )}

              {/* Icon */}
              <div className="w-10 h-10 rounded-md bg-surface-soft flex items-center justify-center text-lg flex-shrink-0">
                💬
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-content truncate mb-1">
                  {conv.title}
                </div>
                <div className="text-xs text-content-muted flex items-center gap-x-3 flex-wrap">
                  <span>📝 {conv.message_count} رسالة</span>
                  <span>🕐 {formatDate(conv.updated_at)}</span>
                </div>
              </div>

              {/* Actions */}
              {!selectionMode && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(conv.id, conv.title); }}
                    title="تعديل العنوان"
                    className="w-8 h-8 rounded-md border border-border text-content-muted hover:text-content hover:border-content-subtle flex items-center justify-center text-xs transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    title="حذف"
                    className="w-8 h-8 rounded-md border border-danger/30 text-danger hover:bg-danger/10 flex items-center justify-center text-xs transition-colors"
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