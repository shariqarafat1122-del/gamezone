import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Ban, CheckCircle, Edit3, Wallet, Eye } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, updateUserProfile, logAdminAction } from '../firebase/userService';
import { UserProfile } from '../types';

export const AdminUsers = () => {
  const { userProfile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModal, setUserModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllUsers(100);
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleBan = async (user: UserProfile) => {
    if (!adminProfile) return;
    setActionLoading(user.uid);
    try {
      const newStatus = user.status === 'banned' ? 'active' : 'banned';
      await updateUserProfile(user.uid, { status: newStatus });
      await logAdminAction(adminProfile.uid, newStatus === 'banned' ? 'BAN_USER' : 'UNBAN_USER', user.uid, `${newStatus === 'banned' ? 'Banned' : 'Unbanned'} user ${user.name}`);
      toast.success(`User ${newStatus === 'banned' ? 'banned' : 'unbanned'}!`);
      loadUsers();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const resetWallet = async (user: UserProfile) => {
    if (!adminProfile) return;
    setActionLoading(user.uid + '_wallet');
    try {
      await updateUserProfile(user.uid, { walletBalance: 0 });
      await logAdminAction(adminProfile.uid, 'RESET_WALLET', user.uid, `Reset wallet for ${user.name}`);
      toast.success('Wallet reset!');
      loadUsers();
    } catch {
      toast.error('Failed to reset wallet');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u =>
    search === '' ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">User Management</h1>
            <p className="text-sm text-gray-500">{users.length} total users</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={loadUsers}>Refresh</Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input-dark pl-11" placeholder="Search by name, username or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Users Table */}
        <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-600"><RefreshCw size={24} className="animate-spin mx-auto mb-2" />Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-600">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Contact</th>
                    <th className="text-left p-4">Balance</th>
                    <th className="text-left p-4">Games</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((user) => (
                    <motion.tr key={user.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                            alt={user.name} className="w-9 h-9 rounded-xl bg-gray-800" />
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-gray-400">{user.email || '-'}</p>
                        <p className="text-xs text-gray-600">{user.mobile || '-'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-yellow-400 font-bold">₹{(user.walletBalance || 0).toFixed(0)}</p>
                        <p className="text-xs text-gray-600">Win: ₹{(user.winningBalance || 0).toFixed(0)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{user.totalGames || 0}</p>
                        <p className="text-xs text-gray-600">₹{(user.totalBet || 0).toFixed(0)} bet</p>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.role === 'admin' ? 'gold' : 'default'}>{user.role}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => { setSelectedUser(user); setUserModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white" title="View">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => toggleBan(user)} disabled={actionLoading === user.uid}
                            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${user.status === 'banned' ? 'text-green-400' : 'text-red-400'}`}
                            title={user.status === 'banned' ? 'Unban' : 'Ban'}>
                            {user.status === 'banned' ? <CheckCircle size={14} /> : <Ban size={14} />}
                          </button>
                          <button onClick={() => resetWallet(user)} disabled={actionLoading === user.uid + '_wallet'}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-orange-400" title="Reset Wallet">
                            <Wallet size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gray-600">No users found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal isOpen={userModal} onClose={() => setUserModal(false)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={selectedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.uid}`}
                alt={selectedUser.name} className="w-16 h-16 rounded-2xl border border-white/10" />
              <div>
                <h3 className="text-lg font-black text-white">{selectedUser.name}</h3>
                <p className="text-gray-400">@{selectedUser.username}</p>
                <Badge variant={selectedUser.status === 'active' ? 'green' : 'red'}>{selectedUser.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Wallet Balance', value: `₹${(selectedUser.walletBalance || 0).toFixed(2)}`, color: 'text-yellow-400' },
                { label: 'Winning Balance', value: `₹${(selectedUser.winningBalance || 0).toFixed(2)}`, color: 'text-green-400' },
                { label: 'Total Deposited', value: `₹${(selectedUser.totalDeposit || 0).toFixed(2)}`, color: 'text-blue-400' },
                { label: 'Total Withdrawn', value: `₹${(selectedUser.totalWithdraw || 0).toFixed(2)}`, color: 'text-red-400' },
                { label: 'Total Bet', value: `₹${(selectedUser.totalBet || 0).toFixed(2)}`, color: 'text-orange-400' },
                { label: 'Games Played', value: selectedUser.totalGames || 0, color: 'text-purple-400' },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600">UID: {selectedUser.uid}</p>
            <div className="flex gap-3">
              <Button variant={selectedUser.status === 'banned' ? 'success' : 'danger'} fullWidth
                onClick={() => { toggleBan(selectedUser); setUserModal(false); }}>
                {selectedUser.status === 'banned' ? 'Unban User' : 'Ban User'}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setUserModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};
