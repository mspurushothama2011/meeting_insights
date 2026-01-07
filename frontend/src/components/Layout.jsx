import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { AXIOS_API_ROOT } from '../utils/axios'

const Layout = ({ children, hideFooter = false }) => {
  const { isDark } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const apiOrigin = (() => { try { return new URL(AXIOS_API_ROOT).origin } catch { return AXIOS_API_ROOT } })()
  const isDev = typeof window !== 'undefined' && (import.meta?.env?.DEV || appOrigin.includes('localhost'))
  const showApiMismatch = false // Hidden by user preference: isDev && apiOrigin && appOrigin && apiOrigin !== appOrigin
  const [dismissed, setDismissed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-accent-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-secondary-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  IMIP
                </h1>
                <p className="text-[10px] tracking-wider uppercase text-gray-500 font-medium">
                  Intelligent Meeting Insights
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status Indicator */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-dark-800/50 rounded-full border border-white/5 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                <span className="text-xs font-medium text-gray-300">
                  System Online
                </span>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-1 py-1 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-secondary-500 to-secondary-700 rounded-full flex items-center justify-center shadow-lg shadow-secondary-500/20 ring-2 ring-dark-900">
                      <span className="text-sm font-bold text-white">
                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUserMenu(false)}
                      />

                      <div className="absolute right-0 mt-3 w-64 glass-panel rounded-xl shadow-2xl border border-white/10 z-20 overflow-hidden transform origin-top-right animate-scale-in">
                        <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                          <p className="text-sm font-semibold text-white">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>

                        <div className="p-2">
                          <button
                            onClick={() => {
                              logout();
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center space-x-3 group"
                          >
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Dev-only API mismatch banner */}
      {showApiMismatch && !dismissed && (
        <div className="bg-warning-500/10 border-b border-warning-500/20 text-warning-200 backdrop-blur-sm relative z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-sm">
            <div>
              <span className="text-warning-400">⚠ Dev Mode:</span> API <span className="font-mono bg-black/20 px-1 rounded">{apiOrigin}</span> ≠ App <span className="font-mono bg-black/20 px-1 rounded">{appOrigin}</span>
            </div>
            <button onClick={() => setDismissed(true)} className="px-2 py-1 text-xs rounded hover:bg-warning-500/20 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      {!hideFooter && (
        <footer className="relative z-10 glass-panel border-t border-white/5 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">
                  © 2025 IMIP. <span className="opacity-50">Powered by Advanced AI.</span>
                </p>
              </div>
              <div className="flex space-x-8 text-sm text-gray-500">
                <button onClick={() => navigate('/documentation')} className="hover:text-primary-400 transition-colors hover:underline decoration-primary-500/30 underline-offset-4">Documentation</button>
                <button onClick={() => navigate('/api-status')} className="hover:text-primary-400 transition-colors hover:underline decoration-primary-500/30 underline-offset-4">API Status</button>
                <button onClick={() => navigate('/support')} className="hover:text-primary-400 transition-colors hover:underline decoration-primary-500/30 underline-offset-4">Support</button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default Layout
