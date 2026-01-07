import React from 'react'
import { Button } from './index'

const EmptyState = ({
  title,
  description,
  icon,
  action,
  actionText,
  onAction,
  children
}) => {
  const defaultIcons = {
    meetings: (
      <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    search: (
      <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    file: (
      <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    error: (
      <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  const renderIcon = () => {
    if (icon) {
      return icon
    }
    if (typeof icon === 'string' && defaultIcons[icon]) {
      return defaultIcons[icon]
    }
    return defaultIcons.meetings
  }

  return (
    <div className="text-center py-12">
      <div className="flex flex-col items-center justify-center">
        {renderIcon()}

        {title && (
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}

        {description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}

        {action && (
          <div className="mt-6">
            <Button
              variant={action.variant || 'primary'}
              onClick={onAction}
              aria-label={actionText || 'Perform action'}
            >
              {actionText || 'Get Started'}
            </Button>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

export default EmptyState
