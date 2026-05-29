import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet, Plus, Minus, ArrowUpRight, ArrowDownLeft, Trophy, Zap,
  Copy, CheckCircle, QrCode, ChevronRight, Clock
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import {
  createDepositRequest,
  createWithdrawalRequest,
  getUserTransactions,
  getUserDeposits,
  getUserWithdrawals
} from '../firebase/userService';
import { Transaction, DepositRequest, WithdrawalRequest } from '../types';
import { format } from 'date-fns';

type WalletTab = 'overview' | 'deposit' | 'withdraw' | 'history';

const UPI_ID = 'gamezone@ybl';
const QR_AMOUNT_AMOUNTS = [100, 200, 500, 1000];

export const WalletPage = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<WalletTab>(
    location.pathname.includes('deposit') ? 'deposit' :
    location.pathname.includes('withdraw') ? 'withdraw' : 'overview'
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Deposit form
  const [depositAmount, setDepositAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserTransactions(userProfile.uid, 20).then(setTransactions).catch(() => {});
    getUserDeposits(userProfile.uid).then(setDeposits).catch(() => {});
    getUserWithdrawals(userProfile.uid).then(setWithdrawals).catch(() => {});
  }, [userProfile?.uid]);

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success('UPI ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !depositAmount || !utrNumber) { toast.error('Fill all fields'); return; }
    const amount = parseFloat(depositAmount);
    if (amount < 100) { toast.error('Minimum deposit ₹100'); return; }
    setIsLoading(true);
    try {
      await createDepositRequest(userProfile.uid, userProfile.name, amount, utrNumber);
      toast.success('Deposit request submitted!', 'Will be approved within 30 minutes');
      setDepositAmount('');
      setUtrNumber('');
      setActiveTab('overview');
      getUserDeposits(userProfile.uid).then(setDeposits);
    } catch (err) {
      toast.error('Failed to submit', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !withdrawAmount || !upiId) { toast.error('Fill all fields'); return; }
    const amount = parseFloat(withdrawAmount);
    if (amount < 100) { toast.error('Minimum withdrawal ₹100'); return; }
    if (amount > (userProfile.walletBalance || 0)) { toast.error('Insufficient balance'); return; }
    setIsLoading(true);
    try {
      await createWithdrawalRequest(userProfile.uid, userProfile.name, amount, upiId);
      toast.success('Withdrawal request submitted!', 'Will be processed within 24 hours');
      setWithdrawAmount('');
      setUpiId('');
      setActiveTab('overview');
    } catch (err) {
      toast.error('Failed to submit', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: WalletTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Wallet size={16} /> },
    { id: 'deposit', label: 'Add Money', icon: <Plus size={16} /> },
    { id: 'withdraw', label: 'Withdraw', icon: <Minus size={16} /> },
    { id: 'history', label: 'History', icon: <Clock size={16} /> },
  ];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Wallet Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-600 via-orange-500 to-amber-600 p-6 mb-6 shadow-2xl"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-black/60 font-medium">Total Wallet Balance</p>
              <Wallet size={20} className="text-black/40" />
            </div>
            <p className="text-4xl font-black text-black mb-4">₹{(userProfile?.walletBalance || 0).toFixed(2)}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/15 rounded-2xl p-3">
                <p className="text-[10px] text-black/50 mb-0.5">Winnings</p>
                <p className="text-lg font-black text-black">₹{(userProfile?.winningBalance || 0).toFixed(2)}</p>
              </div>
              <div className="bg-black/15 rounded-2xl p-3">
                <p className="text-[10px] text-black/50 mb-0.5">Deposits</p>
                <p className="text-lg font-black text-black">₹{(userProfile?.depositBalance || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Deposited', value: userProfile?.totalDeposit || 0, icon: <ArrowDownLeft size={14} className="text-green-400" />, color: 'text-green-400' },
            { label: 'Total Won', value: userProfile?.totalWin || 0, icon: <Trophy size={14} className="text-yellow-400" />, color: 'text-yellow-400' },
            { label: 'Total Bet', value: userProfile?.totalBet || 0, icon: <Zap size={14} className="text-blue-400" />, color: 'text-blue-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-3 text-center">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <p className={`text-sm font-black ${stat.color}`}>₹{stat.value.toFixed(0)}</p>
              <p className="text-[9px] text-gray-600 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1 mb-6 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="flex gap-3 mb-6">
                <Button variant="gold" fullWidth leftIcon={<Plus size={16} />} onClick={() => setActiveTab('deposit')}>Add Money</Button>
                <Button variant="ghost" fullWidth leftIcon={<Minus size={16} />} onClick={() => setActiveTab('withdraw')}>Withdraw</Button>
              </div>

              {/* Recent transactions */}
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <motion.div key="deposit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* UPI Info */}
              <div className="glass-gold rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={20} className="text-yellow-400" />
                  <h3 className="font-bold text-white">Pay via UPI</h3>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl mb-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">UPI ID</p>
                    <p className="font-mono font-bold text-yellow-400">{UPI_ID}</p>
                  </div>
                  <button onClick={copyUPI} className="p-2 rounded-lg hover:bg-white/10">
                    {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} className="text-gray-400" />}
                  </button>
                </div>
                <div className="aspect-square max-w-32 mx-auto bg-white rounded-xl p-2">
                  <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gamezone@ybl')] bg-cover rounded-lg" />
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">Scan QR or pay to UPI ID above</p>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {QR_AMOUNT_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(String(amt))}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${
                      depositAmount === String(amt) ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleDeposit} className="space-y-4">
                <Input label="Amount (₹)" type="number" placeholder="Min ₹100" value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)} leftIcon={<span className="text-sm">₹</span>} />
                <Input label="UTR / Transaction Number" placeholder="12-digit UTR number" value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)} hint="Find UTR in your payment app after transfer" />
                <Button type="submit" variant="gold" fullWidth size="lg" isLoading={isLoading}>
                  Submit Deposit Request
                </Button>
              </form>

              {/* Pending deposits */}
              {deposits.filter(d => d.status === 'pending').length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Pending Deposits</h4>
                  {deposits.filter(d => d.status === 'pending').map((dep) => (
                    <div key={dep.requestId} className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-2">
                      <div>
                        <p className="text-sm font-bold text-white">₹{dep.amount}</p>
                        <p className="text-xs text-gray-500">UTR: {dep.utr}</p>
                      </div>
                      <Badge variant="gold">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <motion.div key="withdraw" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Available to Withdraw</p>
                    <p className="text-2xl font-black text-green-400">₹{(userProfile?.walletBalance || 0).toFixed(2)}</p>
                  </div>
                  <ArrowUpRight size={28} className="text-green-400" />
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <Input label="Withdrawal Amount (₹)" type="number" placeholder="Min ₹100" value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)} leftIcon={<span className="text-sm">₹</span>} />
                <Input label="Your UPI ID" placeholder="yourname@bank" value={upiId}
                  onChange={(e) => setUpiId(e.target.value)} hint="Ensure UPI ID is correct before submitting" />
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400">💡 Withdrawals are processed within 24 hours on business days</p>
                </div>
                <Button type="submit" variant="success" fullWidth size="lg" isLoading={isLoading}>
                  Submit Withdrawal Request
                </Button>
              </form>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-2">
                {transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)}
                {transactions.length === 0 && (
                  <div className="text-center py-12 text-gray-600">
                    <Clock size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-6" />
      </div>
    </MainLayout>
  );
};

const TransactionItem = ({ tx }: { tx: Transaction }) => {
  const isCredit = ['deposit', 'win', 'bonus', 'refund'].includes(tx.type);
  const typeColors: Record<string, string> = {
    deposit: 'text-green-400', win: 'text-yellow-400', bonus: 'text-purple-400',
    withdrawal: 'text-red-400', bet: 'text-orange-400', refund: 'text-blue-400',
  };
  const typeIcons: Record<string, React.ReactNode> = {
    deposit: <ArrowDownLeft size={14} />,
    win: <Trophy size={14} />,
    bonus: <Zap size={14} />,
    withdrawal: <ArrowUpRight size={14} />,
    bet: <Zap size={14} />,
    refund: <ArrowDownLeft size={14} />,
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#16161f] border border-white/5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
        <span className={typeColors[tx.type]}>{typeIcons[tx.type]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{tx.description || tx.type}</p>
        <p className="text-xs text-gray-600">
          {tx.createdAt ? format(new Date(tx.createdAt as string), 'MMM d, yyyy h:mm a') : 'Just now'}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
          {isCredit ? '+' : '-'}₹{(tx.amount || 0).toFixed(2)}
        </p>
        <p className="text-[10px] text-gray-600 capitalize">{tx.type}</p>
      </div>
    </div>
  );
};
