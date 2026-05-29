
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { andarBaharController } from '../../controllers/AndarBaharController';
import { debitWallet } from '../../firebase/userService';
import { AndarBaharRound, AndarBaharOption, Card } from '../../types';

const BET_AMOUNTS = [10, 20, 50, 100, 200, 500];

const MiniCard = ({ card }: { card: Card }) => {
  const suitEmoji: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const isRed = ['hearts', 'diamonds'].includes(card.suit);
  return (
    <div className={`w-8 h-10 bg-white rounded-md flex flex-col items-center justify-center border shadow-sm text-[10px] font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
      <span>{card.rank}</span>
      <span>{suitEmoji[card.suit]}</span>
    </div>
  );
};

export const AndarBaharPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [activeRound, setActiveRound] = useState<AndarBaharRound | null>(null);
  const [selectedOption, setSelectedOption] = useState<AndarBaharOption | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);

  useEffect(() => {
    andarBaharController.initializeGame().catch(() => {});
    const unsub = andarBaharController.subscribeToActiveRound((round) => {
      setActiveRound(round);
      setHasBet(false);
      setTimeLeft(25);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = useCallback(async () => {
    if (!userProfile || !activeRound || !selectedOption) { toast.error('Select Andar or Bahar!'); return; }
    if (activeRound.phase !== 'betting') { toast.error('Betting is locked!'); return; }
    if ((userProfile.walletBalance || 0) < betAmount) { toast.error('Insufficient balance!'); return; }
    if (hasBet) return;
    setIsPlacingBet(true);
    try {
      await debitWallet(userProfile.uid, betAmount, 'bet', `Andar-Bahar Round #${activeRound.roundNumber}`, activeRound.roundId);
      await andarBaharController.placeBet(activeRound.roundId, userProfile.uid, userProfile.name, selectedOption, betAmount);
      setHasBet(true);
      toast.success(`Bet placed on ${selectedOption.toUpperCase()}! 🎴`);
    } catch (err) {
      toast.error('Failed to place bet', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsPlacingBet(false);
    }
  }, [userProfile, activeRound, selectedOption, betAmount, hasBet]);

  return (
    <MainLayout>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/games')} className="p-2 rounded-xl glass hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Andar Bahar</h1>
            <p className="text-xs text-gray-500">Classic Indian Card Game</p>
          </div>
          <Badge variant="gold" className="ml-auto">Live</Badge>
        </div>

        {/* Round Info */}
        <div className="glass-gold rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">Round #{activeRound?.roundNumber || '...'}</p>
              <Badge variant={activeRound?.phase === 'betting' ? 'green' : 'red'}>
                {activeRound?.phase?.toUpperCase() || 'LOADING'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-green-400'}`}>{timeLeft}s</span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft > 10 ? 'timer-bar-green' : timeLeft > 5 ? 'timer-bar-yellow' : 'timer-bar-red'}`}
              style={{ width: `${(timeLeft / 25) * 100}%` }} />
          </div>
        </div>

        {/* Center Card */}
        <div className="glass rounded-2xl p-5 mb-5">
          <p className="text-xs text-gray-500 text-center mb-3">Center Card (Joker)</p>
          <div className="flex justify-center">
            {activeRound?.centerCard ? (
              <motion.div
                initial={{ rotateY: 90, scale: 0.8 }}
                animate={{ rotateY: 0, scale: 1 }}
                className="w-24 h-32 bg-white rounded-xl border-2 border-yellow-400 flex flex-col items-center justify-center shadow-2xl"
              >
                {(() => {
                  const card = activeRound.centerCard!;
                  const suitEmoji: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
                  const isRed = ['hearts', 'diamonds'].includes(card.suit);
                  return (
                    <>
                      <span className={`text-3xl font-black ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</span>
                      <span className={`text-2xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{suitEmoji[card.suit]}</span>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <div className="w-24 h-32 bg-[#1a1a2e] border-2 border-yellow-500/30 rounded-xl flex items-center justify-center">
                <span className="text-4xl">🃏</span>
              </div>
            )}
          </div>
        </div>

        {/* Andar/Bahar cards */}
        {(activeRound?.andarCards?.length || 0) > 0 && (
          <div className="glass rounded-2xl p-4 mb-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-purple-400 mb-2 font-semibold">Andar ({activeRound?.andarCards?.length || 0})</p>
                <div className="flex flex-wrap gap-1">
                  {activeRound?.andarCards?.slice(-6).map((c, i) => <MiniCard key={i} card={c} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-amber-400 mb-2 font-semibold">Bahar ({activeRound?.baharCards?.length || 0})</p>
                <div className="flex flex-wrap gap-1">
                  {activeRound?.baharCards?.slice(-6).map((c, i) => <MiniCard key={i} card={c} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {activeRound?.result && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-4 rounded-2xl mb-5 border ${activeRound.result === 'andar' ? 'bg-purple-600/20 border-purple-500/30' : 'bg-amber-600/20 border-amber-500/30'}`}>
              <Trophy size={24} className="mx-auto mb-2 text-yellow-400" />
              <p className="text-xl font-black text-white capitalize">{activeRound.result} Wins!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {(['andar', 'bahar'] as AndarBaharOption[]).map((opt) => (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => !hasBet && activeRound?.phase === 'betting' && setSelectedOption(opt)}
              disabled={activeRound?.phase !== 'betting' || hasBet}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${
                selectedOption === opt
                  ? opt === 'andar' ? 'border-purple-400 bg-purple-500/20' : 'border-amber-400 bg-amber-500/20'
                  : 'border-white/10 bg-[#16161f]'
              } ${activeRound?.phase !== 'betting' || hasBet ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span className="text-3xl block mb-2">{opt === 'andar' ? '🎴' : '🃏'}</span>
              <p className="text-lg font-black text-white capitalize">{opt}</p>
              <p className="text-xs text-gray-400 mt-1">Win 1.9x</p>
            </motion.button>
          ))}
        </div>

        {/* Bet Amount */}
        <div className="glass rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {BET_AMOUNTS.map((amount) => (
              <button key={amount} onClick={() => setBetAmount(amount)}
                className={`bet-chip mx-auto w-full h-11 rounded-xl text-sm ${betAmount === amount ? 'selected' : ''}`}>
                ₹{amount}
              </button>
            ))}
          </div>
          <input type="number" value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
            className="input-dark text-center font-bold text-yellow-400" />
        </div>

        {hasBet ? (
          <div className="text-center py-4 glass rounded-2xl">
            <Trophy size={24} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-bold">Bet on {selectedOption?.toUpperCase()}!</p>
          </div>
        ) : (
          <Button variant="gold" fullWidth size="xl" isLoading={isPlacingBet} onClick={handlePlaceBet}
            disabled={!selectedOption || activeRound?.phase !== 'betting'}>
            {!selectedOption ? 'Select Andar or Bahar' : `Bet ₹${betAmount} on ${selectedOption.toUpperCase()}`}
          </Button>
        )}
        <div className="h-6" />
      </div>
    </MainLayout>
  );
};
