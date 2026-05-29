import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] bg-[#0a0a0f] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-500/5 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(245,177,48,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,177,48,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-yellow-400/40"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [0, (Math.random() - 0.5) * 300],
            y: [0, (Math.random() - 0.5) * 300],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 1.5,
            repeat: Infinity,
          }}
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
        className="relative mb-8"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 flex items-center justify-center shadow-2xl glow-gold">
          <Trophy size={56} className="text-black" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
        >
          <Zap size={18} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Brand name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <h1 className="text-5xl font-black gold-text tracking-tight mb-1">GameZone</h1>
        <p className="text-lg font-semibold text-gray-400 tracking-[0.3em] uppercase">Premium</p>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-6 text-gray-500 text-sm text-center"
      >
        Win Big. Play Smart. Live the Thrill.
      </motion.p>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48"
      >
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, delay: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          />
        </div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-center text-xs text-gray-600 mt-3"
        >
          Loading...
        </motion.p>
      </motion.div>

      {/* Games marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-36 left-0 right-0 overflow-hidden"
      >
        <div className="flex gap-6 whitespace-nowrap animate-marquee text-xs text-gray-700 font-medium">
          {['🎲 LUDO', '🎨 COLOR PREDICTION', '♠️ POKER', '🎲 ODD EVEN', '🐉 DRAGON TIGER', '🎴 ANDAR BAHAR',
            '🎲 LUDO', '🎨 COLOR PREDICTION', '♠️ POKER', '🎲 ODD EVEN', '🐉 DRAGON TIGER', '🎴 ANDAR BAHAR'].map((game, i) => (
            <span key={i} className="text-gray-600">{game} •</span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
