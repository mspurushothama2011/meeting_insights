import React from 'react'

const Skeleton = ({ className = '', width, height, circle = false, ...props }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700'
  const shapeClasses = circle ? 'rounded-full' : 'rounded'
  const sizeStyles = {
    width: width || '100%',
    height: height || '1rem'
  }

  return (
    <div
      className={`${baseClasses} ${shapeClasses} ${className}`}
      style={sizeStyles}
      {...props}
    />
  )
}

export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  )
}

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton circle width="3rem" height="3rem" />
        <div className="flex-1 space-y-2">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.875rem" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export default Skeleton
