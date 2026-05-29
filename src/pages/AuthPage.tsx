import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Trophy, UserX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest } from '../firebase/authService';
import { useNavigate } from 'react-router-dom';

type AuthMode = 'login' | 'signup';

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    if (mode === 'signup' && !name) { toast.error('Name is required'); return; }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        toast.success('Welcome back! 🎉');
      } else {
        await signUpWithEmail(email, password, name);
        toast.success('Account created! Let\'s play! 🎮');
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auth failed';
      toast.error('Authentication failed', msg.includes('user-not-found') ? 'Account not found' : msg.includes('wrong-password') ? 'Incorrect password' : 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome! 🎉');
      navigate('/');
    } catch {
      toast.error('Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await signInAsGuest();
      toast.success('Playing as Guest!');
      navigate('/');
    } catch {
      toast.error('Guest login failed');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-yellow-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple-500/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(245,177,48,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,177,48,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-600 mb-4 glow-gold">
            <Trophy size={40} className="text-black" />
          </div>
          <h1 className="text-3xl font-black gold-text">GameZone</h1>
          <p className="text-gray-500 text-sm mt-1">Premium Gaming Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a] border border-white/8 rounded-3xl overflow-hidden"
        >
          {/* Top accent */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />

          <div className="p-6">
            {/* Mode toggle */}
            <div className="flex rounded-xl bg-white/5 p-1 mb-6">
              {(['login', 'signup'] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    mode === m ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Button variant="glass" onClick={handleGoogle} isLoading={googleLoading} leftIcon={<span className="text-base">G</span>} className="text-sm">
                Google
              </Button>
              <Button variant="glass" onClick={handleGuest} isLoading={guestLoading} leftIcon={<UserX size={16} />} className="text-sm">
                Guest
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-gray-600">or continue with email</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Input
                      label="Full Name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      leftIcon={<User size={16} />}
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
                autoComplete="email"
              />

              <Input
                label="Password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              <Button type="submit" variant="gold" fullWidth size="lg" isLoading={isLoading}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: '🎲', label: '6 Games' },
                  { icon: '💰', label: 'Win Real ₹' },
                  { icon: '⚡', label: 'Instant' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-1">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-xs text-gray-600">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-700 mt-4">
          By continuing, you agree to our Terms & Privacy Policy. 18+
        </p>
      </div>
    </div>
  );
};
