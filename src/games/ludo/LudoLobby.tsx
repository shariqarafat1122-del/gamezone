// src/games/ludo/LudoLobby.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, Trophy, Coins, Loader2,
  ChevronRight, Zap, Shield, Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { LudoController } from '../../controllers/LudoController';
import { TABLE_OPTIONS } from '../../types/ludo.types';
import type { TableOption, LudoRoom } from '../../types/ludo.types';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// ============================================================
// MATCHMAKING OVERLAY
// ============================================================
const MatchmakingOverlay: React.FC<{
  tableOption: TableOption;
  onCancel: () => void;
}> = ({ tableOption, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-sm text-center"
    >
      {/* Spinning dice */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 rounded-full"
              style={{
                background: tableOption.color,
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 90}deg) translateX(56px) translateY(-50%)`,
              }}
            />
          ))}
        </motion.div>
        <div
          className="absolute inset-6 rounded-2xl flex items-center justify-center text-5xl"
          style={{ background: `${tableOption.color}20`, border: `2px solid ${tableOption.color}40` }}
        >
          🎲
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2">Finding Opponent...</h2>
      <p className="text-white/50 mb-1">{tableOption.label}</p>
      <p className="text-sm text-white/30 mb-8">
        Prize Pool: <span style={{ color: tableOption.color }} className="font-bold">₹{tableOption.prize}</span>
      </p>

      {/* Animated dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ background: tableOption.color }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      <button
        onClick={onCancel}
        className="px-8 py-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all"
      >
        Cancel
      </button>
    </motion.div>
  </motion.div>
);

// ============================================================
// TABLE CARD
// ============================================================
const TableCard: React.FC<{
  option: TableOption;
  waitingRooms: number;
  onJoin: (option: TableOption) => void;
  isLoading: boolean;
  canAfford: boolean;
}> = ({ option, waitingRooms, onJoin, isLoading, canAfford }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.97 }}
    className="relative overflow-hidden rounded-3xl cursor-pointer"
    style={{ border: `1px solid ${option.color}30` }}
  >
    {/* BG */}
    <div
      className="absolute inset-0 opacity-10"
      style={{
        background: `radial-gradient(ellipse at top left, ${option.color}, transparent 60%)`,
      }}
    />

    <div className="relative p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${option.color}20`, border: `1.5px solid ${option.color}40` }}
          >
            🎲
          </div>
          <div>
            <h3 className="font-black text-white text-lg leading-tight">{option.label}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: waitingRooms > 0 ? '#10B981' : option.color }}
              />
              <span className="text-xs text-white/50">
                {waitingRooms > 0 ? `${waitingRooms} player${waitingRooms > 1 ? 's' : ''} waiting` : 'Quick match'}
              </span>
            </div>
          </div>
        </div>
        {option.betAmount === 500 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-bold">VIP</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Entry', value: `₹${option.betAmount}`, icon: '💰' },
          { label: 'Prize', value: `₹${option.prize}`, icon: '🏆' },
          { label: 'Players', value: '1v1', icon: '👥' },
        ].map((stat) => (
          <div key={stat.label} className="p-2.5 rounded-xl bg-black/30 text-center">
            <p className="text-base mb-0.5">{stat.icon}</p>
            <p
              className="text-sm font-black"
              style={{ color: stat.label === 'Prize' ? option.color : 'white' }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-white/30">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="flex items-center gap-3 mb-4 text-xs text-white/40">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 3 Min</span>
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Fair Play</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span>
      </div>

      {/* Join Button */}
      <motion.button
        onClick={() => canAfford && onJoin(option)}
        disabled={isLoading || !canAfford}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all",
          canAfford ? "text-black shadow-lg" : "bg-white/10 text-white/30 cursor-not-allowed"
        )}
        style={
          canAfford
            ? {
                background: `linear-gradient(135deg, ${option.color}, ${option.color}bb)`,
                boxShadow: `0 8px 24px ${option.color}40`,
              }
            : {}
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : canAfford ? (
          <>
            <Zap className="w-4 h-4" />
            Play Now
            <ChevronRight className="w-4 h-4" />
          </>
        ) : (
          `Need ₹${option.betAmount}`
        )}
      </motion.button>
    </div>
  </motion.div>
);

// ============================================================
// LUDO LOBBY MAIN
// ============================================================
const LudoLobby: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useWallet();

  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [selectedOption, setSelectedOption] = useState<TableOption | null>(null);
  const [waitingCounts, setWaitingCounts] = useState<Record<number, number>>({});
  const [loadingTable, setLoadingTable] = useState<number | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Subscribe to waiting room counts
  useEffect(() => {
    const unsubs = TABLE_OPTIONS.map((option) =>
      LudoController.subscribeToLobby(option.betAmount, (rooms) => {
        setWaitingCounts((prev) => ({
          ...prev,
          [option.betAmount]: rooms.length,
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  // Auto-navigate when matched
  useEffect(() => {
    if (!currentRoomId || !isMatchmaking) return;

    const unsub = LudoController.subscribeToRoom(currentRoomId, (room) => {
      if (room.status === 'matched' || room.status === 'playing') {
        setIsMatchmaking(false);
        navigate(`/games/ludo/${currentRoomId}`);
      }
    });

    return unsub;
  }, [currentRoomId, isMatchmaking, navigate]);

  const handleJoin = async (option: TableOption) => {
    if (!user) return;
    setLoadingTable(option.betAmount);
    setSelectedOption(option);

    try {
      const { roomId } = await LudoController.findOrCreateRoom(
        option.betAmount,
        user.uid,
        user.displayName || 'Player',
        user.photoURL || ''
      );

      setCurrentRoomId(roomId);
      setIsMatchmaking(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join table');
    } finally {
      setLoadingTable(null);
    }
  };

  const handleCancel = async () => {
    if (currentRoomId && user) {
      await LudoController.leaveRoom(currentRoomId, user.uid);
    }
    setIsMatchmaking(false);
    setCurrentRoomId(null);
    setSelectedOption(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-black text-white">🎲 Ludo Premium</h1>
              <p className="text-xs text-white/40">1v1 Realtime Battle</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-black text-yellow-400">
              ₹{balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="mx-4 mt-4 mb-6 p-5 rounded-3xl bg-gradient-to-br from-amber-900/50 to-gray-900 border border-amber-500/20 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-4 text-8xl">🎲</div>
        </div>
        <div className="relative">
          <h2 className="text-2xl font-black text-white mb-1">Play & Win</h2>
          <p className="text-white/50 text-sm mb-3">
            Real-time 1v1 Ludo • 3 Minutes • Fair Play
          </p>
          <div className="flex gap-2">
            {['4 Pieces', '3D Dice', '3 Min Game', 'Instant Win'].map((feat) => (
              <span
                key={feat}
                className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white/60 font-medium"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="mx-4 mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
        <h3 className="text-sm font-bold text-blue-400 mb-3">📋 How to Play</h3>
        <div className="space-y-2">
          {[
            '🎲 Roll dice on your turn (15 sec limit)',
            '🔵 Roll 6 to enter pieces on board',
            '⚔️ Eliminate opponent pieces for +10pts',
            '❌ Your piece eliminated = -10pts',
            '🏠 Move all pieces home for bonus',
            '⏱️ Highest score after 3 min wins!',
          ].map((rule) => (
            <p key={rule} className="text-xs text-white/50">{rule}</p>
          ))}
        </div>
      </div>

      {/* Tables */}
      <div className="px-4 space-y-4">
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
          Choose Table
        </h2>
        {TABLE_OPTIONS.map((option) => (
          <TableCard
            key={option.betAmount}
            option={option}
            waitingRooms={waitingCounts[option.betAmount] || 0}
            onJoin={handleJoin}
            isLoading={loadingTable === option.betAmount}
            canAfford={balance >= option.betAmount}
          />
        ))}
      </div>

      {/* Matchmaking Overlay */}
      <AnimatePresence>
        {isMatchmaking && selectedOption && (
          <MatchmakingOverlay
            tableOption={selectedOption}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoLobby;
