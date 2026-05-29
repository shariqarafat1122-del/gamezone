import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { getPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from '../firebase/userService';
import { getDocs, collection, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { WithdrawalRequest } from '../types';
import { format } from 'date-fns';

export const AdminWithdrawals = () => {
  const { userProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      if (filter === 'pending') {
        const data = await getPendingWithdrawals();
        setWithdrawals(data);
      } else {
        const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ ...d.data(), requestId: d.id } as WithdrawalRequest));
        setWithdrawals(filter === 'all' ? all : all.filter(w => w.status === filter));
      }
    } catch {
      toast.error('Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadWithdrawals(); }, [filter]);

  const handleApprove = async (id: string) => {
    if (!userProfile) return;
    setActionLoading(id);
    try {
      await approveWithdrawal(id, userProfile.uid);
      toast.success('Withdrawal approved!');
      loadWithdrawals();
    } catch (err) {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!userProfile || !rejectReason.trim()) { toast.error('Provide a reason'); return; }
    setActionLoading(rejectModal.id);
    try {
      await rejectWithdrawal(rejectModal.id, userProfile.uid, rejectReason);
      toast.success('Withdrawal rejected. Amount refunded.');
      setRejectModal({ open: false, id: '' });
      setRejectReason('');
      loadWithdrawals();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = withdrawals.filter(w =>
    search === '' || w.userName?.toLowerCase().includes(search.toLowerCase()) || w.upiId?.includes(search)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Withdrawal Requests</h1>
            <p className="text-sm text-gray-500">{withdrawals.filter(w => w.status === 'pending').length} pending</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={loadWithdrawals}>Refresh</Button>
        </div>

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
            <input className="input-dark pl-9 text-sm h-9" placeholder="Search by name or UPI..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-600"><RefreshCw size={24} className="animate-spin mx-auto mb-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600"><Clock size={32} className="mx-auto mb-2 opacity-30" /><p>No withdrawals found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-600">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">UPI ID</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((wth) => (
                    <motion.tr key={wth.requestId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2">
                      <td className="p-4">
                        <p className="font-medium text-white">{wth.userName}</p>
                        <p className="text-xs text-gray-600">{wth.uid?.slice(0, 12)}...</p>
                      </td>
                      <td className="p-4"><span className="text-red-400 font-bold text-base">₹{wth.amount}</span></td>
                      <td className="p-4"><span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">{wth.upiId}</span></td>
                      <td className="p-4 text-gray-500 text-xs">
                        {wth.createdAt ? format(new Date(wth.createdAt as string), 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="p-4">
                        <Badge variant={wth.status === 'approved' ? 'green' : wth.status === 'pending' ? 'gold' : 'red'}>
                          {wth.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {wth.status === 'pending' && (
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="success" size="sm" isLoading={actionLoading === wth.requestId}
                              leftIcon={<CheckCircle size={12} />} onClick={() => handleApprove(wth.requestId)}>Approve</Button>
                            <Button variant="danger" size="sm" leftIcon={<XCircle size={12} />}
                              onClick={() => setRejectModal({ open: true, id: wth.requestId })}>Reject</Button>
                          </div>
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

      <Modal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, id: '' })} title="Reject Withdrawal" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Provide a reason. Amount will be refunded to user wallet.</p>
          <textarea className="input-dark w-full resize-none h-24" placeholder="Reason..."
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setRejectModal({ open: false, id: '' })}>Cancel</Button>
            <Button variant="danger" fullWidth isLoading={!!actionLoading} onClick={handleReject}>Reject & Refund</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
