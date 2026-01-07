const Card = ({
  children,
  className = '',
  hover = false,
  elevated = false,
  ariaLabel,
  ...props
}) => {
  const baseClasses = 'glass-panel rounded-2xl'
  const hoverClasses = hover ? 'hover-card cursor-pointer' : ''
  const elevationClasses = elevated ? 'shadow-xl' : ''
  const classes = `${baseClasses} ${elevationClasses} ${hoverClasses} ${className}`

  return (
    <div
      className={classes}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({
  children,
  className = '',
  ariaLevel = '2'
}) => {
  return (
    <div
      className={`px-6 py-5 border-b border-white/5 ${className}`}
    >
      {typeof children === 'string' ? (
        <h2 className="text-xl font-bold text-white tracking-tight" aria-level={ariaLevel}>
          {children}
        </h2>
      ) : (
        children
      )}
    </div>
  )
}

export const CardBody = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`px-6 py-5 ${className}`}
    >
      {children}
    </div>
  )
}

export const CardFooter = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`px-6 py-4 border-t border-white/5 bg-white/5 rounded-b-2xl ${className}`}
    >
      {children}
    </div>
  )
}

export default Card
