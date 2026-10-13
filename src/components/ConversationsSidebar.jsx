import React from 'react';

export default function ConversationsSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}) {
  return (
    <div className="w-64 bg-surface-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
        >
          <span>+</span>
          <span>محادثة جديدة</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-center text-content-subtle text-xs py-8">
            لا توجد محادثات بعد
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map(conv => {
              const active = activeId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`
                    group flex items-center justify-between gap-2
                    p-2.5 rounded-md cursor-pointer transition-colors
                    ${active 
                      ? 'bg-primary/10 border-r-2 border-primary' 
                      : 'hover:bg-surface-soft border-r-2 border-transparent'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`
                      text-sm truncate
                      ${active ? 'text-content font-semibold' : 'text-content font-normal'}
                    `}>
                      {conv.title}
                    </div>
                    <div className="text-xs text-content-subtle mt-0.5">
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
                    className="opacity-0 group-hover:opacity-100 text-danger hover:bg-danger/10 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all"
                    title="حذف"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}