
DragonTigerPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, History, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { dragonTigerController } from '../../controllers/DragonTigerController';
import { debitWallet } from '../../firebase/userService';
import { DragonTigerRound, DragonTigerOption, Card } from '../../types';

const BET_AMOUNTS = [10, 20, 50, 100, 200, 500];
const OPTIONS: { value: DragonTigerOption; label: string; emoji: string; multiplier: string; class: string }[] = [
  { value: 'dragon', label: 'Dragon', emoji: '🐉', multiplier: '1.9x', class: 'bg-game-dragon' },
  { value: 'tie', label: 'Tie', emoji: '⚔️', multiplier: '8x', class: 'bg-yellow-900' },
  { value: 'tiger', label: 'Tiger', emoji: '🐅', multiplier: '1.9x', class: 'bg-game-tiger' },
];

const CardDisplay = ({ card, label }: { card?: Card; label: string }) => {
  const suitEmoji: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const isRed = card && ['hearts', 'diamonds'].includes(card.suit);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-500">{label}</p>
      <motion.div
        initial={{ rotateY: 90 }}
        animate={{ rotateY: card ? 0 : 90 }}
        transition={{ duration: 0.4 }}
        className="w-20 h-28 bg-white rounded-xl border-2 border-gray-200 flex flex-col items-center justify-center shadow-xl"
      >
        {card ? (
          <>
            <span className={`text-2xl font-black ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</span>
            <span className={`text-xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{suitEmoji[card.suit]}</span>
          </>
        ) : (
          <span className="text-4xl">🂠</span>
        )}
      </motion.div>
    </div>
  );
};

export const DragonTigerPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [activeRound, setActiveRound] = useState<DragonTigerRound | null>(null);
  const [history, setHistory] = useState<DragonTigerRound[]>([]);
  const [selectedOption, setSelectedOption] = useState<DragonTigerOption | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);

  useEffect(() => {
    dragonTigerController.initializeGame().catch(() => {});
    const unsub = dragonTigerController.subscribeToActiveRound((round) => {
      setActiveRound(round);
      setHasBet(false);
    });
    dragonTigerController.getRoundHistory(10).then(setHistory);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeRound) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    setTimeLeft(25);
    return () => clearInterval(interval);
  }, [activeRound?.roundId]);

  const handlePlaceBet = useCallback(async () => {
    if (!userProfile || !activeRound || !selectedOption) {
      toast.error('Select an option!');
      return;
    }
    if (activeRound.phase !== 'betting') { toast.error('Betting is locked!'); return; }
    if ((userProfile.walletBalance || 0) < betAmount) { toast.error('Insufficient balance!'); return; }
    if (hasBet) { toast.info('Already placed bet!'); return; }
    setIsPlacingBet(true);
    try {
      await debitWallet(userProfile.uid, betAmount, 'bet', `Dragon Tiger - Round #${activeRound.roundNumber}`, activeRound.roundId);
      await dragonTigerController.placeBet(activeRound.roundId, userProfile.uid, userProfile.name, selectedOption, betAmount);
      setHasBet(true);
      toast.success(`Bet placed on ${selectedOption.toUpperCase()}!`);
    } catch (err) {
      toast.error('Failed to place bet', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsPlacingBet(false);
    }
  }, [userProfile, activeRound, selectedOption, betAmount, hasBet]);

  const timerColor = timeLeft > 10 ? 'timer-bar-green' : timeLeft > 5 ? 'timer-bar-yellow' : 'timer-bar-red';

  return (
    <MainLayout>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/games')} className="p-2 rounded-xl glass hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Dragon Tiger</h1>
            <p className="text-xs text-gray-500">Dragon vs Tiger • Instant Win</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400 live-indicator" />
            <span className="text-xs text-red-400">Live</span>
          </div>
        </div>

        {/* Round Info */}
        <div className="glass-gold rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">Round</p>
              <p className="text-xl font-black gold-text">#{activeRound?.roundNumber || '...'}</p>
            </div>
            <Badge variant={activeRound?.phase === 'betting' ? 'green' : activeRound?.phase === 'result' ? 'gold' : 'red'}>
              {activeRound?.phase?.toUpperCase() || 'LOADING'}
            </Badge>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs text-gray-400">Timer</span>
            </div>
            <span className={`text-base font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-green-400'}`}>{timeLeft}s</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full ${timerColor} rounded-full transition-all duration-1000`} style={{ width: `${(timeLeft / 25) * 100}%` }} />
          </div>
        </div>

        {/* Cards Display */}
        <div className="glass rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-around">
            <CardDisplay card={activeRound?.dragonCard} label="Dragon 🐉" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <span className="text-lg">⚔️</span>
              </div>
              <AnimatePresence>
                {activeRound?.result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <p className="text-xs text-gray-400">Winner</p>
                    <p className="text-sm font-black text-yellow-400 capitalize">{activeRound.result}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <CardDisplay card={activeRound?.tigerCard} label="Tiger 🐅" />
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => !hasBet && activeRound?.phase === 'betting' && setSelectedOption(opt.value)}
              disabled={activeRound?.phase !== 'betting' || hasBet}
              className={`relative overflow-hidden rounded-2xl p-4 text-center transition-all border-2 ${opt.class} ${
                selectedOption === opt.value ? 'border-white/50 scale-105 shadow-xl' : 'border-transparent opacity-80'
              } ${activeRound?.phase !== 'betting' || hasBet ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-100'}`}
            >
              <span className="text-2xl block mb-1">{opt.emoji}</span>
              <p className="text-sm font-bold text-white">{opt.label}</p>
              <p className="text-xs text-white/70">{opt.multiplier}</p>
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
          <input type="number" value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
            className="input-dark text-center font-bold text-yellow-400" min={10} max={10000} />
        </div>

        {hasBet ? (
          <div className="text-center py-4 glass rounded-2xl">
            <Trophy size={24} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-bold">Bet Placed! Awaiting cards...</p>
          </div>
        ) : (
          <Button variant="gold" fullWidth size="xl" isLoading={isPlacingBet} onClick={handlePlaceBet}
            disabled={!selectedOption || activeRound?.phase !== 'betting'}>
            {!selectedOption ? 'Select Dragon/Tiger/Tie' : `Place ₹${betAmount} on ${selectedOption?.toUpperCase()}`}
          </Button>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-300">History</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {history.map((r) => (
                <div key={r.roundId}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border-2 border-white/10 ${
                    r.result === 'dragon' ? 'bg-red-700' : r.result === 'tiger' ? 'bg-blue-700' : 'bg-yellow-700'
                  }`}>
                  {r.result === 'dragon' ? '🐉' : r.result === 'tiger' ? '🐅' : '⚔️'}
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
export default DragonTigerPage
