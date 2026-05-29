// src/pages/auth/Login.tsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Loader2, Chrome, UserX } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle, signInAsGuest } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading('email')
    try {
      await signInWithEmail(email, password)
      toast.success('Welcome back! 🎮')
      navigate('/')
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' ? 'Account not found'
        : err.code === 'auth/wrong-password' ? 'Wrong password'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try later'
        : 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleGoogle = async () => {
    setLoading('google')
    try {
      await signInWithGoogle()
      toast.success('Welcome! 🎮')
      navigate('/')
    } catch {
      toast.error('Google sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  const handleGuest = async () => {
    setLoading('guest')
    try {
      await signInAsGuest()
      toast.success('Playing as guest')
      navigate('/')
    } catch {
      toast.error('Guest login failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xl shadow-yellow-500/30">
            🎮
          </div>
          <h1 className="text-3xl font-black text-white">
            Game<span className="text-yellow-400">Zone</span>
          </h1>
          <p className="text-white/40 mt-1">Sign in to play & win</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 rounded-3xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-black text-white mb-6">Welcome Back</h2>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-white/50 font-bold mb-1.5 block">EMAIL</label>
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/5 transition-all',
                errors.email ? 'border-red-500/50' : 'border-white/10 focus-within:border-yellow-500/50'
              )}>
                <Mail className="w-4 h-4 text-white/30 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-white/50 font-bold mb-1.5 block">PASSWORD</label>
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/5 transition-all',
                errors.password ? 'border-red-500/50' : 'border-white/10 focus-within:border-yellow-500/50'
              )}>
                <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!!loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30 disabled:opacity-60"
            >
              {loading === 'email' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social logins */}
          <div className="space-y-2">
            <motion.button
              onClick={handleGoogle}
              disabled={!!loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-60"
            >
              {loading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Chrome className="w-4 h-4" />
                  Continue with Google
                </>
              )}
            </motion.button>

            <motion.button
              onClick={handleGuest}
              disabled={!!loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl border border-white/10 bg-white/5 text-white/60 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-60"
            >
              {loading === 'guest' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  Play as Guest
                </>
              )}
            </motion.button>
          </div>

          {/* Register link */}
          <p className="text-center text-white/40 text-sm mt-4">
            No account?{' '}
            <Link to="/register" className="text-yellow-400 font-bold hover:text-yellow-300">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
