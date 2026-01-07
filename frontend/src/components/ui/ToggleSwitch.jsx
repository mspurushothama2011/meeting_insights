import React from 'react'

const ToggleSwitch = ({
  checked = false,
  onChange,
  disabled = false,
  label = '',
  labelPosition = 'right',
  size = 'md',
  color = 'primary',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-10 h-5 before:w-3 before:h-3',
    md: 'w-12 h-6 before:w-4 before:h-4',
    lg: 'w-14 h-7 before:w-5 before:h-5'
  }

  const colorClasses = {
    primary: 'checked:bg-primary-600',
    secondary: 'checked:bg-secondary-600',
    success: 'checked:bg-success-600',
    warning: 'checked:bg-warning-600',
    danger: 'checked:bg-danger-600'
  }

  const containerClasses = `
    inline-flex items-center cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `

  const labelClasses = `
    ml-3 text-sm font-medium text-gray-300
    ${labelPosition === 'left' ? 'order-first mr-3 ml-0' : ''}
  `

  return (
    <label className={containerClasses}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <span className={`
        toggle-slider relative inline-block rounded-full transition-colors duration-200
        bg-white/10 border border-white/10
        ${sizeClasses[size]}
        ${colorClasses[color]}
        ${disabled ? '' : 'peer'}
      `}>
        <span className={`
          absolute top-1/2 left-1 transform -translate-y-1/2
          bg-white rounded-full transition-transform duration-200 shadow-sm
          before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:transform before:-translate-x-1/2 before:-translate-y-1/2
          ${checked ? 'translate-x-full' : ''}
          ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}
        `}></span>
      </span>
      {label && (
        <span className={labelClasses}>
          {label}
        </span>
      )}
    </label>
  )
}

export default ToggleSwitch