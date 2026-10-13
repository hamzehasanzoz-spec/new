import React from 'react';

export default function Input({
  label,
  error,
  hint,
  icon,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-content-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle text-sm pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          className={`
            w-full bg-surface-soft border border-border rounded-md
            px-3 py-2.5 text-sm text-content
            placeholder:text-content-subtle
            focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
            transition-all duration-150
            ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}
            ${icon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-content-subtle">{hint}</p>
      )}
    </div>
  );
}