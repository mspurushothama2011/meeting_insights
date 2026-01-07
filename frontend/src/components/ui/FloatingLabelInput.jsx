import React, { useState, useEffect } from 'react'

const FloatingLabelInput = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)

  useEffect(() => {
    setHasValue(value !== undefined && value !== null && value !== '')
  }, [value])

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const inputClasses = `
    w-full px-4 py-3 rounded-xl border transition-all duration-200
    bg-white/5 text-white placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed
    ${error
      ? 'border-danger-500 focus:ring-danger-500'
      : 'border-white/10 hover:border-white/20'
    }
    ${className}
  `

  const labelClasses = `
    absolute left-4 transition-all duration-200 pointer-events-none
    ${error
      ? 'text-danger-400'
      : 'text-gray-400'
    }
    ${isFocused || hasValue
      ? 'top-2 text-xs'
      : 'top-1/2 transform -translate-y-1/2 text-base'
    }
    ${isFocused && !error ? 'text-primary-400' : ''}
  `

  return (
    <div className="floating-label-input relative w-full">
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused || hasValue ? placeholder : ''}
          required={required}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused || hasValue ? placeholder : ''}
          required={required}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
      )}
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </label>
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-danger-400' : 'text-gray-400'}`}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export default FloatingLabelInput