import React from 'react';

export default function Card({ children, className = '', padding = 'md' }) {
  const paddings = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-surface-card border border-border rounded-lg
        ${paddings[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}