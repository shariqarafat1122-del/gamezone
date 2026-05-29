import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Zap, Dice1, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { ludoController } from '../../controllers/LudoGameController';
import { LudoRoom } from '../../types';

const BET_AMOUNTS = [
  { amount: 10, prize: 18, label: '₹10' },
  { amount: 20, prize: 36, label: '₹20' },
  { amount: 50, prize: 90, label: '₹50' },
  { amount: 100, prize: 180, label: '₹100' },
  { amount: 500, prize: 900, label: '₹500' },
];

export const LudoPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [selectedBet, setSelectedBet] = useState(10);
  const [activeRoom, setActiveRoom] = useState<LudoRoom | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [gamePhase, setGamePhase] = useState<'lobby' | 'waiting' | 'playing'>('lobby');

  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  useEffect(() => {
    if (activeRoom) {
      const unsub = ludoController.subscribeToRoom(activeRoom.roomId, (room) => {
        if (room) {
          setActiveRoom(room);
          if (room.status === 'playing') setGamePhase('playing');
          if (room.status === 'completed') {
            const isWinner = room.winnerId === userProfile?.uid;
            if (isWinner) toast.success('🎲 You Won!', `₹${room.prize} added to your wallet!`);
            else toast.error('Better luck next time!');
            setGamePhase('lobby');
            setActiveRoom(null);
          }
        }
      });
      return () => unsub();
    }
  }, [activeRoom?.roomId, userProfile?.uid]);

  const handleJoinGame = async () => {
    if (!userProfile) return;
    if ((userProfile.walletBalance || 0) < selectedBet) {
      toast.error('Insufficient balance!', 'Please add money to your wallet.');
      return;
    }
    setIsJoining(true);
    try {
      const roomId = await ludoController.findOrCreateRoom(selectedBet, userProfile.uid, userProfile.name, userProfile.avatar);
      const room = await new Promise<LudoRoom>((resolve) => {
        const unsub = ludoController.subscribeToRoom(roomId, (r) => {
          if (r) { unsub(); resolve(r); }
        });
      });
      setActiveRoom(room);
      setGamePhase(room.status === 'playing' ? 'playing' : 'waiting');
      toast.success('Joined game!', room.status === 'open' ? 'Waiting for opponent...' : 'Game starting!');
    } catch (err) {
      toast.error('Failed to join game', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRollDice = async () => {
    if (!userProfile || !activeRoom || activeRoom.currentTurn !== userProfile.uid) {
      toast.error('Not your turn!');
      return;
    }
    setIsRolling(true);
    try {
      const value = await ludoController.rollDice(activeRoom.roomId, userProfile.uid);
      setDiceValue(value);
      toast.info(`Rolled ${value}!`);
    } catch (err) {
      toast.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <MainLayout>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/games')} className="p-2 rounded-xl glass hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Ludo Premium</h1>
            <p className="text-xs text-gray-500">Roll Dice • Move Pieces • Win</p>
          </div>
          <Badge variant="blue" className="ml-auto">Multiplayer</Badge>
        </div>

        {gamePhase === 'lobby' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Info Card */}
            <div className="glass-gold rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🎲</span>
                <div>
                  <h3 className="font-bold text-white">Classic Ludo</h3>
                  <p className="text-xs text-gray-400">2 Players • 90% Prize Pool</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 rounded-xl p-3">
                  <Users size={16} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Players</p>
                  <p className="font-bold text-white">2</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <Trophy size={16} className="text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Prize</p>
                  <p className="font-bold text-yellow-400">90%</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <Clock size={16} className="text-green-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Avg Time</p>
                  <p className="font-bold text-white">15m</p>
                </div>
              </div>
            </div>

            {/* Select Bet */}
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Entry Fee</h3>
            <div className="space-y-2 mb-5">
              {BET_AMOUNTS.map((bet) => (
                <motion.button
                  key={bet.amount}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedBet(bet.amount)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    selectedBet === bet.amount
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-white/5 bg-[#16161f] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                      selectedBet === bet.amount ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-400'
                    }`}>
                      {bet.label}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">Entry: {bet.label}</p>
                      <p className="text-xs text-gray-500">Total Pool: ₹{bet.amount * 2}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">Win ₹{bet.prize}</p>
                    <p className="text-xs text-gray-600">Prize</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <Button variant="gold" fullWidth size="xl" isLoading={isJoining} leftIcon={<Zap size={18} />} onClick={handleJoinGame}>
              Find Game (₹{selectedBet})
            </Button>

            <div className="mt-4 p-3 glass rounded-xl text-center">
              <p className="text-xs text-gray-500">💡 Auto-matched with same amount players</p>
            </div>
          </motion.div>
        )}

        {gamePhase === 'waiting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 mx-auto mb-6"
            />
            <h3 className="text-xl font-bold text-white mb-2">Finding Opponent...</h3>
            <p className="text-gray-500 text-sm mb-1">Room #{activeRoom?.roomId?.slice(-6)}</p>
            <p className="text-gray-500 text-sm">Entry: ₹{activeRoom?.betAmount}</p>
            <p className="text-gray-600 text-xs mt-4">Players: {activeRoom?.players?.length}/{activeRoom?.maxPlayers}</p>
            <div className="flex gap-2 justify-center mt-4">
              {activeRoom?.players?.map((p) => (
                <div key={p.uid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <img src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full" />
                  <span className="text-xs text-green-400">{p.name}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="mt-8" onClick={() => setGamePhase('lobby')}>
              Cancel
            </Button>
          </motion.div>
        )}

        {gamePhase === 'playing' && activeRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Game board header */}
            <div className="glass-gold rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Prize Pool</p>
                  <p className="text-xl font-black gold-text">₹{activeRoom.prize}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Your Turn</p>
                  <Badge variant={activeRoom.currentTurn === userProfile?.uid ? 'green' : 'gray'}>
                    {activeRoom.currentTurn === userProfile?.uid ? '✓ YOUR TURN' : 'WAITING'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {activeRoom.players.map((player) => (
                <div
                  key={player.uid}
                  className={`p-3 rounded-xl border ${
                    activeRoom.currentTurn === player.uid
                      ? 'border-yellow-500/40 bg-yellow-500/10'
                      : 'border-white/5 bg-[#16161f]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${player.color}-500`} />
                    <span className="text-xs font-medium text-white truncate">{player.name}</span>
                    {activeRoom.currentTurn === player.uid && (
                      <Badge variant="gold" size="sm">Turn</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Dice */}
            <div className="flex flex-col items-center gap-5 py-8">
              <motion.div
                animate={isRolling ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="w-24 h-24 glass rounded-2xl flex items-center justify-center text-6xl border border-yellow-500/20 shadow-xl"
              >
                {diceValue > 0 ? DICE_FACES[diceValue - 1] : '🎲'}
              </motion.div>
              <Button
                variant="gold"
                size="xl"
                isLoading={isRolling}
                onClick={handleRollDice}
                disabled={activeRoom.currentTurn !== userProfile?.uid}
                leftIcon={<Dice1 size={20} />}
              >
                {activeRoom.currentTurn === userProfile?.uid ? 'Roll Dice' : 'Wait for your turn'}
              </Button>
            </div>

            {/* Simplified board representation */}
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">Board Status</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/5 flex items-center justify-center">
                    <span className="text-xs text-gray-600">P{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div className="h-6" />
      </div>
    </MainLayout>
  );
};
