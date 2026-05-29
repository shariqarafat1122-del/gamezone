// src/pages/auth/Register.tsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Loader2, Chrome } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { signUpWithEmail, signInWithGoogle } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.email) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signUpWithEmail(form.email, form.password, form.name)
      toast.success('Account created! Welcome to GameZone 🎮')
      navigate('/')
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email already registered' : 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch {
      toast.error('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'name', label: 'FULL NAME', icon: User, type: 'text', placeholder: 'Your full name' },
    { key: 'email', label: 'EMAIL', icon: Mail, type: 'email', placeholder: 'your@email.com' },
    { key: 'password', label: 'PASSWORD', icon: Lock, type: showPass ? 'text' : 'password', placeholder: '••••••••' },
    { key: 'confirm', label: 'CONFIRM PASSWORD', icon: Lock, type: showPass ? 'text' : 'password', placeholder: '••••••••' },
  ]

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <motion.div className="text-center mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-xl shadow-yellow-500/20">
            🎮
          </div>
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">Join GameZone & win real cash</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-900 rounded-3xl border border-white/10 p-6"
        >
          <form onSubmit={handleRegister} className="space-y-3">
            {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-white/50 font-bold mb-1 block">{label}</label>
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/5',
                  errors[key] ? 'border-red-500/50' : 'border-white/10 focus-within:border-yellow-500/50'
                )}>
                  <Icon className="w-4 h-4 text-white/30" />
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={update(key)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                  />
                  {(key === 'password' || key === 'confirm') && (
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-white/30">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
              </div>
            ))}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </button>

          <p className="text-center text-white/40 text-sm mt-4">
            Already have account?{' '}
            <Link to="/login" className="text-yellow-400 font-bold">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Register
