import React from 'react'

const ProgressBar = ({
  value = 0,
  max = 100,
  color = 'primary',
  size = 'md',
  showPercentage = false,
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-500',
    secondary: 'bg-secondary-600 dark:bg-secondary-500',
    success: 'bg-success-600 dark:bg-success-500',
    warning: 'bg-warning-600 dark:bg-warning-500',
    danger: 'bg-danger-600 dark:bg-danger-500'
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  const containerClasses = `
    w-full rounded-full overflow-hidden
    bg-gray-200 dark:bg-gray-700
    ${sizeClasses[size]}
    ${className}
  `

  const fillClasses = `
    h-full rounded-full transition-all duration-300 ease-in-out
    ${colorClasses[color]}
  `

  return (
    <div className="w-full">
      <div className={containerClasses} {...props}>
        <div
          className={fillClasses}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin="0"
          aria-valuemax={max}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-right text-sm text-gray-500 dark:text-gray-400">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}

export default ProgressBar