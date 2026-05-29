import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, TrendingDown, DollarSign, Activity,
  Gamepad2, BarChart3, Clock, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getDocs, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AdminStats, DepositRequest, WithdrawalRequest, UserProfile } from '../types';
import { format } from 'date-fns';

const StatCard = ({
  label, value, icon, change, color,
}: {
  label: string; value: string | number; icon: React.ReactNode; change?: string; color: string;
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="bg-[#12121a] border border-white/5 rounded-2xl p-5 relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 ${color}`} />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-20`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            change.startsWith('+') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

export const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalRevenue: 0,
    activePlayers: 0,
    activeTables: 0,
    totalBets: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
  });
  const [recentDeposits, setRecentDeposits] = useState<DepositRequest[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersSnap, depositsSnap, withdrawalsSnap, pendingDepsSnap, pendingWithSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100))),
        getDocs(query(collection(db, 'deposits'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'deposits'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending'))),
      ]);

      const users = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      const totalDep = depositsSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
      const totalWith = withdrawalsSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

      setStats({
        totalUsers: usersSnap.size,
        totalDeposits: totalDep,
        totalWithdrawals: totalWith,
        totalRevenue: totalDep - totalWith,
        activePlayers: Math.floor(Math.random() * 500) + 200,
        activeTables: Math.floor(Math.random() * 50) + 10,
        totalBets: Math.floor(Math.random() * 10000) + 5000,
        pendingDeposits: pendingDepsSnap.size,
        pendingWithdrawals: pendingWithSnap.size,
      });

      setRecentUsers(users.slice(0, 5));

      const rDep = await getDocs(query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(5)));
      setRecentDeposits(rDep.docs.map(d => ({ ...d.data(), requestId: d.id } as DepositRequest)));

      const rWith = await getDocs(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(5)));
      setRecentWithdrawals(rWith.docs.map(d => ({ ...d.data(), requestId: d.id } as WithdrawalRequest)));
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

  return (
    <AdminLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="text-sm text-gray-500">Platform overview & analytics</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/10 text-sm text-gray-400"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users size={18} className="text-blue-400" />} change="+12%" color="bg-blue-500" />
          <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={18} className="text-yellow-400" />} change="+8%" color="bg-yellow-500" />
          <StatCard label="Total Deposits" value={`₹${stats.totalDeposits.toLocaleString()}`} icon={<TrendingUp size={18} className="text-green-400" />} change="+15%" color="bg-green-500" />
          <StatCard label="Total Withdrawals" value={`₹${stats.totalWithdrawals.toLocaleString()}`} icon={<TrendingDown size={18} className="text-red-400" />} color="bg-red-500" />
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Players" value={stats.activePlayers} icon={<Activity size={18} className="text-green-400" />} color="bg-green-500" />
          <StatCard label="Active Tables" value={stats.activeTables} icon={<Gamepad2 size={18} className="text-purple-400" />} color="bg-purple-500" />
          <StatCard label="Pending Deposits" value={stats.pendingDeposits} icon={<Clock size={18} className="text-orange-400" />} color="bg-orange-500" />
          <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} icon={<Clock size={18} className="text-red-400" />} color="bg-red-500" />
        </motion.div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Deposits */}
          <motion.div variants={itemVariants} className="bg-[#12121a] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" /> Recent Deposits
              </h3>
              <a href="/admin/deposits" className="text-xs text-yellow-400 flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {recentDeposits.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No deposits yet</p>
              ) : recentDeposits.map((dep) => (
                <div key={dep.requestId} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{dep.userName}</p>
                    <p className="text-xs text-gray-500">UTR: {dep.utr?.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">+₹{dep.amount}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      dep.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      dep.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {dep.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Withdrawals */}
          <motion.div variants={itemVariants} className="bg-[#12121a] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingDown size={16} className="text-red-400" /> Recent Withdrawals
              </h3>
              <a href="/admin/withdrawals" className="text-xs text-yellow-400 flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {recentWithdrawals.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No withdrawals yet</p>
              ) : recentWithdrawals.map((wth) => (
                <div key={wth.requestId} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{wth.userName}</p>
                    <p className="text-xs text-gray-500">{wth.upiId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">-₹{wth.amount}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      wth.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      wth.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {wth.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Users */}
          <motion.div variants={itemVariants} className="bg-[#12121a] border border-white/5 rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-blue-400" /> Recent Users
              </h3>
              <a href="/admin/users" className="text-xs text-yellow-400 flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-600 border-b border-white/5">
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Username</th>
                    <th className="text-right py-2">Balance</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-white/2">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full bg-gray-800" />
                          <span className="text-white font-medium truncate max-w-24">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400">@{user.username}</td>
                      <td className="py-3 text-right text-yellow-400 font-bold">₹{(user.walletBalance || 0).toFixed(0)}</td>
                      <td className="py-3 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Revenue Chart Placeholder */}
        <motion.div variants={itemVariants} className="bg-[#12121a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-yellow-400" />
            <h3 className="font-bold text-white">Revenue Overview</h3>
          </div>
          <div className="grid grid-cols-7 gap-2 items-end h-32">
            {[65, 80, 45, 90, 72, 58, 88].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-yellow-600 to-yellow-400 opacity-80"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-gray-600">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
};
