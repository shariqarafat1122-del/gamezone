import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { getPendingDeposits, approveDeposit, rejectDeposit, getAllUsers } from '../firebase/userService';
import { getDocs, collection, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DepositRequest } from '../types';
import { format } from 'date-fns';

export const AdminDeposits = () => {
  const { userProfile } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; depositId: string }>({ open: false, depositId: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadDeposits = async () => {
    setIsLoading(true);
    try {
      if (filter === 'pending') {
        const data = await getPendingDeposits();
        setDeposits(data);
      } else {
        const q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ ...d.data(), requestId: d.id } as DepositRequest));
        setDeposits(filter === 'all' ? all : all.filter(d => d.status === filter));
      }
    } catch (err) {
      toast.error('Failed to load deposits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDeposits(); }, [filter]);

  const handleApprove = async (depositId: string) => {
    if (!userProfile) return;
    setActionLoading(depositId);
    try {
      await approveDeposit(depositId, userProfile.uid);
      toast.success('Deposit approved!', 'Wallet credited successfully');
      loadDeposits();
    } catch (err) {
      toast.error('Failed to approve', err instanceof Error ? err.message : 'Try again');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!userProfile || !rejectReason.trim()) { toast.error('Provide a reason'); return; }
    setActionLoading(rejectModal.depositId);
    try {
      await rejectDeposit(rejectModal.depositId, userProfile.uid, rejectReason);
      toast.success('Deposit rejected');
      setRejectModal({ open: false, depositId: '' });
      setRejectReason('');
      loadDeposits();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = deposits.filter(d =>
    search === '' || d.userName?.toLowerCase().includes(search.toLowerCase()) || d.utr?.includes(search)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Deposit Requests</h1>
            <p className="text-sm text-gray-500">{deposits.length} total • {deposits.filter(d => d.status === 'pending').length} pending</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={loadDeposits}>Refresh</Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
                }`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input-dark pl-9 text-sm h-9"
              placeholder="Search by name or UTR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-600">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p>No deposits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-600">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">UTR</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((dep) => (
                    <motion.tr key={dep.requestId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-white">{dep.userName}</p>
                        <p className="text-xs text-gray-600">{dep.uid?.slice(0, 12)}...</p>
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 font-bold text-base">₹{dep.amount}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">{dep.utr}</span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {dep.createdAt ? format(new Date(dep.createdAt as string), 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="p-4">
                        <Badge variant={dep.status === 'approved' ? 'green' : dep.status === 'pending' ? 'gold' : 'red'}>
                          {dep.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {dep.status === 'pending' && (
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="success" size="sm" isLoading={actionLoading === dep.requestId}
                              leftIcon={<CheckCircle size={12} />} onClick={() => handleApprove(dep.requestId)}>
                              Approve
                            </Button>
                            <Button variant="danger" size="sm"
                              leftIcon={<XCircle size={12} />}
                              onClick={() => setRejectModal({ open: true, depositId: dep.requestId })}>
                              Reject
                            </Button>
                          </div>
                        )}
                        {dep.status !== 'pending' && (
                          <span className="text-xs text-gray-600">{dep.adminNote || '-'}</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, depositId: '' })} title="Reject Deposit" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Please provide a reason for rejecting this deposit.</p>
          <textarea
            className="input-dark w-full resize-none h-24"
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setRejectModal({ open: false, depositId: '' })}>Cancel</Button>
            <Button variant="danger" fullWidth isLoading={!!actionLoading} onClick={handleReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
