// src/layouts/AdminLayout.tsx
import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CreditCard, ArrowDownLeft,
  Gamepad2, Bell, Menu, X, LogOut, ChevronRight, Shield
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

const ADMIN_NAV = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/deposits', icon: CreditCard, label: 'Deposits' },
  { path: '/admin/withdrawals', icon: ArrowDownLeft, label: 'Withdrawals' },
  { path: '/admin/games', icon: Gamepad2, label: 'Games' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
]

const AdminLayout: React.FC = () => {
  const { userProfile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path: string, exact?: boolean) => {
    return exact ? location.pathname === path : location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-white/5 fixed h-full z-40">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-xl">
              🎮
            </div>
            <div>
              <h1 className="font-black text-white">GameZone</h1>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-bold">Admin Panel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {ADMIN_NAV.map(({ path, icon: Icon, label, exact }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all',
                isActive(path, exact)
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {isActive(path, exact) && (
                <ChevronRight className="w-3 h-3 ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-sm">
                {userProfile?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{userProfile?.name}</p>
              <p className="text-xs text-yellow-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-sm">
            🎮
          </div>
          <span className="font-black text-white">Admin</span>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-xl bg-white/5"
        >
          {menuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="md:hidden fixed inset-0 z-40 bg-black/80"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="w-72 h-full bg-gray-900 p-6"
              onClick={e => e.stopPropagation()}
            >
              <nav className="space-y-1 mt-12">
                {ADMIN_NAV.map(({ path, icon: Icon, label, exact }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm',
                      isActive(path, exact)
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'text-white/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
