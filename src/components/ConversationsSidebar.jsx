import React from 'react';

export default function ConversationsSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}) {
  return (
    <div style={{
      width: 260,
      background: '#fff',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '75vh',
      borderRadius: '0 16px 16px 0',
      overflow: 'hidden',
    }}>
      {/* رأس */}
      <div style={{ padding: 14, borderBottom: '1px solid #E2E8F0' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: '#2A5C82',
            color: '#fff',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9em',
          }}
        >
          + محادثة جديدة
        </button>
      </div>

      {/* قائمة المحادثات */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {conversations.length === 0 ? (
          <p style={{
            color: '#94A3B8',
            textAlign: 'center',
            padding: 20,
            fontSize: '0.85em',
          }}>
            لا توجد محادثات بعد
          </p>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              style={{
                padding: '10px 12px',
                marginBottom: 4,
                borderRadius: 8,
                cursor: 'pointer',
                background: activeId === conv.id ? '#EFF6FF' : 'transparent',
                borderRight: activeId === conv.id ? '3px solid #2A5C82' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
              onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.88em',
                  fontWeight: activeId === conv.id ? 'bold' : 'normal',
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {conv.title}
                </div>
                <div style={{ fontSize: '0.72em', color: '#94A3B8', marginTop: 2 }}>
                  {new Date(conv.updated_at).toLocaleDateString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('حذف هذه المحادثة؟')) onDelete(conv.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: '1em',
                  padding: 4,
                }}
                title="حذف"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}