import React from 'react';

const variants = {
  primary: 'bg-primary hover:bg-primary-light text-white shadow-sm',
  secondary: 'bg-surface-card hover:bg-surface-soft text-content border border-border',
  ghost: 'bg-transparent hover:bg-surface-card text-content-muted hover:text-content',
  danger: 'bg-danger hover:opacity-90 text-white',
  success: 'bg-success hover:opacity-90 text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-primary/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}