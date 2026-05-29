// src/admin/AdminPokerControl.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PokerController, TABLE_CONFIGS } from '../controllers/PokerController';
import type { PokerTable, TableCategory } from '../types/poker.types';
import { Users, Trash2, Plus, RefreshCw, Eye, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const AdminPokerControl: React.FC = () => {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<PokerTable | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [stats, setStats] = useState({ tables: 0, players: 0, totalPot: 0 });

  useEffect(() => {
    const q = query(
      collection(db, 'poker_tables'),
      where('isActive', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const tableData = snapshot.docs.map(d => ({
        ...d.data(),
        tableId: d.id,
      } as PokerTable));
      setTables(tableData);

      setStats({
        tables: tableData.length,
        players: tableData.reduce((s, t) => s + t.players.length, 0),
        totalPot: tableData.reduce((s, t) => s + t.pot, 0),
      });
    });

    return unsub;
  }, []);

  const handleCreateTable = async (category: TableCategory) => {
    setIsCreating(true);
    try {
      const tableId = await PokerController.createTable(category);
      toast.success(`Created ${TABLE_CONFIGS[category].label} table`);
    } catch (error) {
      toast.error('Failed to create table');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseTable = async (tableId: string) => {
    try {
      await updateDoc(doc(db, 'poker_tables', tableId), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      toast.success('Table closed');
    } catch (error) {
      toast.error('Failed to close table');
    }
  };

  const handleForceStartRound = async (tableId: string) => {
    try {
      await PokerController.startRound(tableId);
      toast.success('Round started');
    } catch (error) {
      toast.error('Failed to start round');
    }
  };

  const categoryStats = Object.values(TABLE_CONFIGS).map(config => ({
    config,
    count: tables.filter(t => t.category === config.category).length,
    players: tables
      .filter(t => t.category === config.category)
      .reduce((s, t) => s + t.players.length, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Tables', value: stats.tables, icon: '🎮', color: '#10B981' },
          { label: 'Live Players', value: stats.players, icon: '👥', color: '#3B82F6' },
          { label: 'Total Pot', value: `₹${stats.totalPot.toLocaleString()}`, icon: '💰', color: '#F59E0B' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-white/10 bg-white/5 text-center"
          >
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Create Tables */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="text-sm font-bold text-white mb-3">Create New Table</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.values(TABLE_CONFIGS).map((config) => (
            <motion.button
              key={config.category}
              onClick={() => handleCreateTable(config.category)}
              disabled={isCreating}
              whileTap={{ scale: 0.95 }}
              className="py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                borderColor: `${config.color}40`,
                background: `${config.color}15`,
                color: config.color,
              }}
            >
              <Plus className="w-3 h-3" />
              {config.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {categoryStats.map(({ config, count, players }) => (
          <div
            key={config.category}
            className="p-3 rounded-xl border border-white/10 bg-white/5"
            style={{ borderColor: `${config.color}30` }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: config.color }}>
              {config.label}
            </p>
            <p className="text-lg font-bold text-white">{count} tables</p>
            <p className="text-xs text-white/40">{players} players</p>
          </div>
        ))}
      </div>

      {/* Active Tables List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Active Tables</h3>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-white/30">No active tables</div>
        ) : (
          tables.map((table) => (
            <motion.div
              key={table.tableId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-white/10 bg-white/5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ background: TABLE_CONFIGS[table.category].color }}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {TABLE_CONFIGS[table.category].label} •{' '}
                      #{table.tableId.slice(-4).toUpperCase()}
                    </p>
                    <p className="text-xs text-white/40">
                      Phase: {table.phase} • Round: {table.roundNumber}
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
                  <div className="text-right">
                    <p className="text-xs text-white/40">Players</p>
                    <p className="text-sm font-bold text-white">
                      {table.players.length}/{table.config.maxPlayers}
                    </p>
                  </div>
                </div>
              </div>

              {/* Players list */}
              <div className="flex flex-wrap gap-2 mb-3">
                {table.players.map((player) => (
                  <div
                    key={player.uid}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        player.status === 'active' ? "bg-green-400" :
                        player.status === 'folded' ? "bg-red-400" :
                        player.status === 'all-in' ? "bg-yellow-400" :
                        "bg-gray-400"
                      )}
                    />
                    <span className="text-xs text-white">{player.name}</span>
                    <span className="text-xs text-yellow-400">₹{player.chipStack}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {table.phase === 'waiting' && table.players.length >= 2 && (
                  <button
                    onClick={() => handleForceStartRound(table.tableId)}
                    className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Force Start
                  </button>
                )}
                <button
                  onClick={() => handleCloseTable(table.tableId)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Close Table
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPokerControl;
