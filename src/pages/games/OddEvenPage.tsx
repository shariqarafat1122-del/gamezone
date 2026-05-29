import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { oddEvenController } from '../../controllers/OddEvenController';
import { debitWallet } from '../../firebase/userService';
import { OddEvenRound, OddEvenOption } from '../../types';

const BET_AMOUNTS = [10, 20, 50, 100, 200, 500];

export const OddEvenPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [activeRound, setActiveRound] = useState<OddEvenRound | null>(null);
  const [history, setHistory] = useState<OddEvenRound[]>([]);
  const [selectedOption, setSelectedOption] = useState<OddEvenOption | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);

  useEffect(() => {
    oddEvenController.initializeGame().catch(() => {});
    const unsub = oddEvenController.subscribeToActiveRound((round) => {
      setActiveRound(round);
      setHasBet(false);
      setTimeLeft(25);
    });
    oddEvenController.getRoundHistory(10).then(setHistory);
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = useCallback(async () => {
    if (!userProfile || !activeRound || !selectedOption) { toast.error('Select Odd or Even!'); return; }
    if (activeRound.phase !== 'betting') { toast.error('Betting is locked!'); return; }
    if ((userProfile.walletBalance || 0) < betAmount) { toast.error('Insufficient balance!'); return; }
    if (hasBet) { toast.info('Already placed bet!'); return; }
    setIsPlacingBet(true);
    try {
      await debitWallet(userProfile.uid, betAmount, 'bet', `Odd-Even Round #${activeRound.roundNumber}`, activeRound.roundId);
      await oddEvenController.placeBet(activeRound.roundId, userProfile.uid, userProfile.name, selectedOption, betAmount);
      setHasBet(true);
      toast.success(`Bet placed on ${selectedOption.toUpperCase()}! ⚡`);
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
            <h1 className="text-xl font-black text-white">Odd Even</h1>
            <p className="text-xs text-gray-500">Simple • Fast • Win 1.9x</p>
          </div>
          <Badge variant="green" className="ml-auto">Live</Badge>
        </div>

        {/* Round Info */}
        <div className="glass-gold rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">Round #{activeRound?.roundNumber || '...'}</p>
              <Badge variant={activeRound?.phase === 'betting' ? 'green' : 'red'}>
                {activeRound?.phase?.toUpperCase() || 'LOADING'}
              </Badge>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Clock size={14} className="text-gray-400" />
                <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-green-400'}`}>{timeLeft}s</span>
              </div>
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timeLeft > 10 ? 'timer-bar-green' : timeLeft > 5 ? 'timer-bar-yellow' : 'timer-bar-red'}`}
              style={{ width: `${(timeLeft / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {activeRound?.result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center mb-6"
            >
              <div className={`inline-flex flex-col items-center px-8 py-5 rounded-2xl ${
                activeRound.result === 'odd' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-green-600/20 border border-green-500/30'
              }`}>
                <p className="text-4xl font-black text-white mb-1">{activeRound.resultNumber}</p>
                <p className={`text-lg font-bold capitalize ${activeRound.result === 'odd' ? 'text-blue-400' : 'text-green-400'}`}>
                  {activeRound.result}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {(['odd', 'even'] as OddEvenOption[]).map((opt) => (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => !hasBet && activeRound?.phase === 'betting' && setSelectedOption(opt)}
              disabled={activeRound?.phase !== 'betting' || hasBet}
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                selectedOption === opt
                  ? opt === 'odd' ? 'border-blue-400 bg-blue-500/20 scale-105' : 'border-green-400 bg-green-500/20 scale-105'
                  : 'border-white/10 bg-[#16161f] hover:border-white/20'
              } ${activeRound?.phase !== 'betting' || hasBet ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <div className={`text-4xl mb-2 ${
                opt === 'odd' ? (selectedOption === opt ? '🔵' : '⚡') : (selectedOption === opt ? '🟢' : '⚡')
              }`}>
                {opt === 'odd' ? '1️⃣' : '2️⃣'}
              </div>
              <p className="text-xl font-black text-white capitalize">{opt}</p>
              <p className="text-sm text-gray-400 mt-1">Win 1.9x</p>
            </motion.button>
          ))}
        </div>

        {/* Bet Amount */}
        <div className="glass rounded-2xl p-4 mb-5">
          <p className="text-sm text-gray-400 mb-3">Bet Amount</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {BET_AMOUNTS.map((amount) => (
              <button key={amount} onClick={() => setBetAmount(amount)}
                className={`bet-chip mx-auto w-full h-11 rounded-xl text-sm ${betAmount === amount ? 'selected' : ''}`}>
                ₹{amount}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={betAmount}
              onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
              className="input-dark text-center font-bold text-yellow-400" min={10} max={5000} />
            <span className="text-gray-500 text-sm whitespace-nowrap">
              Win: <span className="text-green-400 font-bold">₹{(betAmount * 1.9).toFixed(0)}</span>
            </span>
          </div>
        </div>

        {hasBet ? (
          <div className="text-center py-4 glass rounded-2xl">
            <Trophy size={24} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-bold">Bet on {selectedOption?.toUpperCase()}! Waiting for result...</p>
          </div>
        ) : (
          <Button variant="gold" fullWidth size="xl" isLoading={isPlacingBet} onClick={handlePlaceBet}
            disabled={!selectedOption || activeRound?.phase !== 'betting'}>
            {!selectedOption ? 'Select Odd or Even' : `Place ₹${betAmount} on ${selectedOption.toUpperCase()}`}
          </Button>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-300 mb-3">History</p>
            <div className="flex gap-2 flex-wrap">
              {history.map((r) => (
                <div key={r.roundId}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white/10 ${
                    r.result === 'odd' ? 'bg-blue-600' : 'bg-green-600'
                  } text-white`}>
                  {r.result === 'odd' ? 'O' : 'E'}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="h-6" />
      </div>
    </MainLayout>
  );
};
