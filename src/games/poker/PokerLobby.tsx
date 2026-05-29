// src/games/poker/PokerLobby.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Coins, ChevronRight, Loader2, Plus, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { PokerController, TABLE_CONFIGS } from '../../controllers/PokerController';
import type { PokerTable, TableCategory, TableConfig } from '../../types/poker.types';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// ============================================================
// CATEGORY CARD COMPONENT
// ============================================================

interface CategoryCardProps {
  config: TableConfig;
  tables: PokerTable[];
  onJoin: (category: TableCategory) => void;
  isLoading: boolean;
  walletBalance: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  config,
  tables,
  onJoin,
  isLoading,
  walletBalance,
}) => {
  const availableTables = tables.filter(t => !t.isFull);
  const totalPlayers = tables.reduce((sum, t) => sum + t.players.length, 0);
  const canAfford = walletBalance >= config.minBuyIn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm cursor-pointer"
      style={{ borderColor: `${config.color}30` }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `radial-gradient(circle at top right, ${config.color}, transparent 70%)`,
        }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${config.color}20`, border: `1px solid ${config.color}40` }}
            >
              ♠️
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{config.label}</h3>
              <p className="text-xs text-white/50">
                Blinds: ₹{config.smallBlind}/₹{config.bigBlind}
              </p>
            </div>
          </div>

          {config.category === 'vip' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <Crown className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-yellow-400 font-bold">VIP</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold" style={{ color: config.color }}>
              {tables.length}
            </p>
            <p className="text-xs text-white/40">Tables</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold text-white">{totalPlayers}</p>
            <p className="text-xs text-white/40">Players</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold text-emerald-400">
              {availableTables.length}
            </p>
            <p className="text-xs text-white/40">Open</p>
          </div>
        </div>

        {/* Buy-in info */}
        <div className="flex items-center justify-between mb-4 p-2 rounded-lg bg-white/5">
          <div>
            <p className="text-xs text-white/40">Min Buy-in</p>
            <p className="font-bold text-white">₹{config.minBuyIn.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Max Buy-in</p>
            <p className="font-bold text-white">₹{config.maxBuyIn.toLocaleString()}</p>
          </div>
        </div>

        {/* Join button */}
        <motion.button
          onClick={() => canAfford && onJoin(config.category)}
          disabled={isLoading || !canAfford}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
            canAfford
              ? "text-black"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          )}
          style={
            canAfford
              ? { background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }
              : {}
          }
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : canAfford ? (
            <>
              <Plus className="w-4 h-4" />
              Join Table
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            `Need ₹${config.minBuyIn} to play`
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================================
// LIVE TABLES LIST
// ============================================================

interface LiveTableProps {
  table: PokerTable;
  onJoin: (tableId: string, category: TableCategory) => void;
  currentUserId: string;
}

const LiveTableRow: React.FC<LiveTableProps> = ({ table, onJoin, currentUserId }) => {
  const isSeated = table.players.some(p => p.uid === currentUserId);
  const isFull = table.isFull;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center text-lg border border-green-500/20">
            ♠️
          </div>
          <div
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black",
              isFull ? "bg-red-500" : table.players.length > 0 ? "bg-yellow-500" : "bg-green-500"
            )}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            Table #{table.tableId.slice(-4).toUpperCase()}
          </p>
          <p className="text-xs text-white/40">
            {table.players.length}/{table.config.maxPlayers} players
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-xs text-white/40">Pot</p>
          <p className="text-sm font-bold text-yellow-400">
            ₹{table.pot.toLocaleString()}
          </p>
        </div>

        {isSeated ? (
          <button
            onClick={() => onJoin(table.tableId, table.category)}
            className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold"
          >
            Rejoin
          </button>
        ) : isFull ? (
          <span className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold">
            Full
          </span>
        ) : (
          <button
            onClick={() => onJoin(table.tableId, table.category)}
            className="px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold"
          >
            Join
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// BUY-IN MODAL
// ============================================================

interface BuyInModalProps {
  config: TableConfig;
  walletBalance: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
  isLoading: boolean;
}

const BuyInModal: React.FC<BuyInModalProps> = ({
  config,
  walletBalance,
  onConfirm,
  onClose,
  isLoading,
}) => {
  const [buyIn, setBuyIn] = useState(config.minBuyIn);

  const presets = [
    config.minBuyIn,
    Math.floor((config.minBuyIn + config.maxBuyIn) / 2),
    config.maxBuyIn,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-2">Buy-In Amount</h3>
        <p className="text-sm text-white/50 mb-6">
          {config.label} Table • Blinds ₹{config.smallBlind}/₹{config.bigBlind}
        </p>

        {/* Balance */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5">
          <span className="text-sm text-white/50">Your Balance</span>
          <span className="font-bold text-yellow-400">₹{walletBalance.toLocaleString()}</span>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setBuyIn(preset)}
              className={cn(
                "py-2 rounded-lg text-sm font-bold border transition-all",
                buyIn === preset
                  ? "border-yellow-400 bg-yellow-400/20 text-yellow-400"
                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
              )}
            >
              ₹{preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mb-6">
          <label className="text-xs text-white/40 mb-1 block">Custom Amount</label>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5">
            <span className="text-yellow-400 font-bold">₹</span>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min={config.minBuyIn}
              max={Math.min(config.maxBuyIn, walletBalance)}
              className="flex-1 bg-transparent text-white font-bold outline-none"
            />
          </div>
          <p className="text-xs text-white/30 mt-1">
            Min: ₹{config.minBuyIn} • Max: ₹{config.maxBuyIn}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 font-bold hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <motion.button
            onClick={() => onConfirm(buyIn)}
            disabled={
              isLoading ||
              buyIn < config.minBuyIn ||
              buyIn > config.maxBuyIn ||
              buyIn > walletBalance
            }
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Join Table'
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// MAIN POKER LOBBY
// ============================================================

const PokerLobby: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useWallet();

  const [tables, setTables] = useState<PokerTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TableCategory | null>(null);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'tables'>('lobby');

  const categories = Object.values(TABLE_CONFIGS);

  // Subscribe to all tables
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    categories.forEach(config => {
      const unsub = PokerController.subscribeToLobby(config.category, (categoryTables) => {
        setTables(prev => {
          const filtered = prev.filter(t => t.category !== config.category);
          return [...filtered, ...categoryTables];
        });
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, []);

  const handleCategoryJoin = (category: TableCategory) => {
    setSelectedCategory(category);
    setShowBuyIn(true);
  };

  const handleTableJoin = async (tableId: string, category: TableCategory) => {
    setSelectedCategory(category);
    // Direct join - use existing table
    navigate(`/games/poker/${tableId}`);
  };

  const handleBuyInConfirm = async (amount: number) => {
    if (!user || !selectedCategory) return;

    setIsJoining(true);
    try {
      const tableId = await PokerController.findAvailableTable(selectedCategory);
      const result = await PokerController.joinTable(
        tableId,
        user.uid,
        user.displayName || 'Player',
        user.photoURL || '',
        amount
      );

      if (result.success) {
        toast.success('Joined table successfully!');
        setShowBuyIn(false);
        navigate(`/games/poker/${tableId}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to join table');
    } finally {
      setIsJoining(false);
    }
  };

  const allTables = tables.filter(t => t.isActive);
  const activeTables = allTables.filter(t => t.players.length > 0);

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/5">
              ←
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                ♠️ Texas Hold'em
              </h1>
              <p className="text-xs text-white/40">
                {activeTables.length} active tables
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">
              ₹{balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {['lobby', 'tables'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'lobby' | 'tables')}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                activeTab === tab
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Tables', value: allTables.length, icon: '🎮' },
                  { label: 'Players', value: allTables.reduce((s, t) => s + t.players.length, 0), icon: '👥' },
                  { label: 'Total Pot', value: `₹${allTables.reduce((s, t) => s + t.pot, 0)}`, icon: '💰' },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-lg">{stat.icon}</p>
                    <p className="text-sm font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/40">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Category cards */}
              <div className="grid gap-4">
                {categories.map((config) => {
                  const categoryTables = tables.filter(t => t.category === config.category);
                  return (
                    <CategoryCard
                      key={config.category}
                      config={config}
                      tables={categoryTables}
                      onJoin={handleCategoryJoin}
                      isLoading={isJoining && selectedCategory === config.category}
                      walletBalance={balance}
                    />
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tables"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {allTables.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-4">♠️</p>
                  <p className="text-white/50">No active tables</p>
                  <p className="text-sm text-white/30 mt-1">Join a category to create one</p>
                </div>
              ) : (
                allTables.map((table) => (
                  <LiveTableRow
                    key={table.tableId}
                    table={table}
                    onJoin={handleTableJoin}
                    currentUserId={user?.uid || ''}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buy-In Modal */}
      <AnimatePresence>
        {showBuyIn && selectedCategory && (
          <BuyInModal
            config={TABLE_CONFIGS[selectedCategory]}
            walletBalance={balance}
            onConfirm={handleBuyInConfirm}
            onClose={() => setShowBuyIn(false)}
            isLoading={isJoining}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PokerLobby;
