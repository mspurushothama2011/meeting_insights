import React from 'react'

const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ariaLabel
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full'

  const variantClasses = {
    primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20',
    secondary: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border border-secondary-500/20',
    success: 'bg-success-500/10 text-success-600 dark:text-success-400 border border-success-500/20',
    warning: 'bg-warning-500/10 text-warning-600 dark:text-warning-400 border border-warning-500/20',
    danger: 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/20',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20',
    outline: 'bg-transparent border border-white/10 text-gray-400'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <span
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  )
}

export default Badge
