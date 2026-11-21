import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-brand text-white shadow-brand hover:bg-brand-hover',
  secondary: 'bg-surface-soft text-content border border-border hover:bg-surface',
  ghost: 'bg-transparent text-content-muted hover:text-content hover:bg-surface-soft',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-medical-teal text-white hover:opacity-90',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-base rounded-xl font-bold',
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
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus:ring-offset-surface
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
    </motion.button>
  );
}