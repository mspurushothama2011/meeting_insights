import React from 'react'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ariaLabel,
  icon,
  iconPosition = 'left'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden active:scale-95 tracking-wide'

  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/20 focus:ring-primary-500 border border-transparent',
    secondary: 'bg-dark-800 text-gray-200 border border-white/10 hover:bg-dark-700 hover:border-white/20 hover:text-white focus:ring-dark-600',
    accent: 'bg-gradient-to-r from-accent-600 to-accent-500 text-white hover:from-accent-500 hover:to-accent-400 shadow-lg shadow-accent-500/20 focus:ring-accent-500 border border-transparent',
    success: 'bg-gradient-to-r from-success-600 to-success-500 text-white hover:from-success-500 hover:to-success-400 shadow-lg shadow-success-500/20 focus:ring-success-500 border border-transparent',
    warning: 'bg-gradient-to-r from-warning-600 to-warning-500 text-white hover:from-warning-500 hover:to-warning-400 shadow-lg shadow-warning-500/20 focus:ring-warning-500 border border-transparent',
    danger: 'bg-gradient-to-r from-danger-600 to-danger-500 text-white hover:from-danger-500 hover:to-danger-400 shadow-lg shadow-danger-500/20 focus:ring-danger-500 border border-transparent',
    outline: 'border-2 border-white/10 hover:bg-white/5 text-gray-300 hover:text-white hover:border-white/20',
    ghost: 'hover:bg-white/5 text-gray-400 hover:text-white'
  }

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3.5 text-lg',
    xl: 'px-8 py-4 text-xl'
  }

  const classes = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size]} ${className}`

  // Add aria-busy when loading
  const ariaBusy = loading ? true : undefined

  // Handle ripple effect
  const handleClick = (e) => {
    if (disabled || loading) return

    // Create ripple effect
    const button = e.currentTarget
    const circle = document.createElement("span")
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`
    circle.classList.add("ripple")

    const ripple = button.getElementsByClassName("ripple")[0]
    if (ripple) {
      ripple.remove()
    }

    button.appendChild(circle)

    // Call original onClick handler
    if (onClick) onClick(e)
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && iconPosition === 'left' && (
        <span className="mr-2 flex items-center">
          {icon}
        </span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="ml-2 flex items-center">
          {icon}
        </span>
      )}
    </button>
  )
}

export default Button