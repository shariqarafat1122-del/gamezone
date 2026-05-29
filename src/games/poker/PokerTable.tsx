// src/games/poker/PokerTable.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Volume2, VolumeX, Timer, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PokerController } from '../../controllers/PokerController';
import type { PokerTable as PokerTableType, PokerPlayer, Card, GamePhase } from '../../types/poker.types';
import PokerCard from './PokerCard';
import PokerPlayerSeat from './PokerPlayer';
import PokerActions from './PokerActions';
import PokerWinnerDisplay from './PokerWinner';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// ============================================================
// PHASE INDICATOR
// ============================================================

const PhaseIndicator: React.FC<{ phase: GamePhase }> = ({ phase }) => {
  const phaseConfig = {
    waiting: { label: 'Waiting for Players', color: '#6B7280' },
    'pre-flop': { label: 'Pre-Flop', color: '#3B82F6' },
    flop: { label: 'Flop', color: '#10B981' },
    turn: { label: 'Turn', color: '#F59E0B' },
    river: { label: 'River', color: '#EF4444' },
    showdown: { label: 'Showdown', color: '#8B5CF6' },
    finished: { label: 'Round Over', color: '#6B7280' },
  };

  const config = phaseConfig[phase];

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: `${config.color}20`,
        border: `1px solid ${config.color}40`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: config.color }}
      />
      <span className="text-xs font-bold" style={{ color: config.color }}>
        {config.label}
      </span>
    </motion.div>
  );
};

// ============================================================
// POT DISPLAY
// ============================================================

const PotDisplay: React.FC<{ pot: number }> = ({ pot }) => (
  <motion.div
    key={pot}
    initial={{ scale: 1.2 }}
    animate={{ scale: 1 }}
    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 border border-yellow-500/30"
  >
    <span className="text-lg">💰</span>
    <div>
      <p className="text-xs text-white/40">Pot</p>
      <p className="text-lg font-bold text-yellow-400">₹{pot.toLocaleString()}</p>
    </div>
  </motion.div>
);

// ============================================================
// ACTION TIMER
// ============================================================

const ActionTimer: React.FC<{ timeLeft: number; isMyTurn: boolean }> = ({
  timeLeft,
  isMyTurn,
}) => {
  const percentage = (timeLeft / 30) * 100;
  const color = timeLeft > 10 ? '#10B981' : timeLeft > 5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex items-center gap-2">
      <Timer className="w-4 h-4" style={{ color }} />
      <div className="w-24 h-2 rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {timeLeft}s
      </span>
    </div>
  );
};

// ============================================================
// POKER TABLE FELT
// ============================================================

const TableFelt: React.FC<{
  players: PokerPlayer[];
  communityCards: Card[];
  phase: GamePhase;
  pot: number;
  currentUserId: string;
  activePlayerSeat: number;
}> = ({ players, communityCards, phase, pot, currentUserId, activePlayerSeat }) => {
  const seats = [0, 1, 2, 3];
  const seatPositions = [
    { top: '5%', left: '50%', transform: 'translateX(-50%)' },
    { top: '50%', right: '2%', transform: 'translateY(-50%)' },
    { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
    { top: '50%', left: '2%', transform: 'translateY(-50%)' },
  ];

  return (
    <div className="relative w-full aspect-[4/3] max-h-80">
      {/* Table felt */}
      <div className="absolute inset-4 rounded-[40%] bg-gradient-to-br from-green-900 to-green-950 border-4 border-yellow-900/50 shadow-2xl">
        {/* Inner border */}
        <div className="absolute inset-2 rounded-[35%] border border-yellow-700/20" />

        {/* Center area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          {/* Community cards */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-12">
                {communityCards[i] ? (
                  <PokerCard card={communityCards[i]} isVisible size="sm" />
                ) : (
                  <div className="w-full h-full rounded-md bg-green-800/50 border border-green-700/30" />
                )}
              </div>
            ))}
          </div>

          {/* Pot */}
          {pot > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 border border-yellow-500/20">
              <span className="text-xs text-yellow-400 font-bold">POT: ₹{pot}</span>
            </div>
          )}

          {/* Phase */}
          {phase !== 'waiting' && (
            <div
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ color: '#D4AF37' }}
            >
              {phase.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Player seats */}
      {seats.map((seatIndex, i) => {
        const player = players.find(p => p.seatIndex === seatIndex);
        const isActive = player?.seatIndex === activePlayerSeat;
        const isCurrentUser = player?.uid === currentUserId;

        return (
          <div
            key={seatIndex}
            className="absolute"
            style={seatPositions[i] as React.CSSProperties}
          >
            <PokerPlayerSeat
              player={player || null}
              seatIndex={seatIndex}
              isActive={isActive}
              isCurrentUser={isCurrentUser}
              phase={phase}
            />
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// MAIN POKER TABLE COMPONENT
// ============================================================

const PokerTable: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [table, setTable] = useState<PokerTableType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const prevPhaseRef = useRef<GamePhase | null>(null);

  const currentPlayer = table?.players.find(p => p.uid === user?.uid);
  const activePlayers = table?.players.filter(
    p => p.status === 'active' || p.status === 'all-in'
  ) || [];
  const activePlayer = table ? activePlayers[table.activePlayerIndex] : null;
  const isMyTurn = activePlayer?.uid === user?.uid;
  const myPlayer = table?.players.find(p => p.uid === user?.uid);

  // Subscribe to table updates
  useEffect(() => {
    if (!tableId) return;

    const unsub = PokerController.subscribeToTable(tableId, (updatedTable) => {
      setTable(updatedTable);
      setIsLoading(false);

      // Show winner display when game finishes
      if (updatedTable.phase === 'showdown' || updatedTable.phase === 'finished') {
        if (prevPhaseRef.current !== updatedTable.phase) {
          setShowWinner(true);
          setTimeout(() => {
            setShowWinner(false);
            // Auto-start new round
            if (updatedTable.players.filter(p => p.status !== 'sitting-out').length >= 2) {
              PokerController.startRound(tableId);
            }
          }, 5000);
        }
      }

      // Auto-start when enough players
      if (
        updatedTable.phase === 'waiting' &&
        updatedTable.players.length >= 2 &&
        prevPhaseRef.current === 'waiting'
      ) {
        setTimeout(() => PokerController.startRound(tableId), 2000);
      }

      prevPhaseRef.current = updatedTable.phase;
    });

    return unsub;
  }, [tableId]);

  const handleAction = useCallback(
    async (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => {
      if (!tableId || !user) return;

      setActionLoading(true);
      try {
        const result = await PokerController.playerAction(tableId, user.uid, action, amount);
        if (!result.success) {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error('Action failed');
      } finally {
        setActionLoading(false);
      }
    },
    [tableId, user]
  );

  const handleLeave = async () => {
    if (!tableId || !user) return;
    await PokerController.leaveTable(tableId, user.uid);
    navigate('/games/poker');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading table...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Table not found</p>
          <button
            onClick={() => navigate('/games/poker')}
            className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-bold"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-950/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeave}
            className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-white">
              {table.config.label} Table
            </p>
            <p className="text-xs text-white/40">
              Round #{table.roundNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PhaseIndicator phase={table.phase} />
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-white/5"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white/40" />
            ) : (
              <Volume2 className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col items-center justify-between p-4">
        <div className="w-full max-w-lg">
          <TableFelt
            players={table.players}
            communityCards={table.communityCards}
            phase={table.phase}
            pot={table.pot}
            currentUserId={user?.uid || ''}
            activePlayerSeat={activePlayer?.seatIndex ?? -1}
          />
        </div>

        {/* My hole cards */}
        {myPlayer && myPlayer.holeCards.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-white/40 text-center mb-2">Your Cards</p>
            <div className="flex items-center justify-center gap-3">
              {myPlayer.holeCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                >
                  <PokerCard card={card} isVisible size="md" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Timer */}
        {isMyTurn && table.phase !== 'waiting' && (
          <div className="mt-3">
            <ActionTimer timeLeft={table.actionTimer} isMyTurn={isMyTurn} />
          </div>
        )}

        {/* Actions */}
        {isMyTurn && myPlayer && (
          <div className="w-full max-w-lg mt-4">
            <PokerActions
              player={myPlayer}
              currentBet={table.currentBet}
              phase={table.phase}
              onAction={handleAction}
              isLoading={actionLoading}
              minRaise={table.currentBet * 2}
              maxRaise={myPlayer.chipStack + myPlayer.currentBet}
            />
          </div>
        )}

        {/* My chip stack */}
        {myPlayer && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10">
            <span className="text-sm text-white/50">My Stack:</span>
            <span className="font-bold text-yellow-400">
              ₹{myPlayer.chipStack.toLocaleString()}
            </span>
            {myPlayer.currentBet > 0 && (
              <>
                <span className="text-white/30">|</span>
                <span className="text-xs text-white/40">
                  Bet: ₹{myPlayer.currentBet}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Winner Display Overlay */}
      <AnimatePresence>
        {showWinner && table.winners.length > 0 && (
          <PokerWinnerDisplay winners={table.winners} onClose={() => setShowWinner(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PokerTable;
