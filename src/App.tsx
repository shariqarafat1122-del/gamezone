// src/App.tsx
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WalletProvider } from './context/WalletContext'
import { NotificationProvider } from './context/NotificationContext'
import { useAuth } from './context/AuthContext'
import LoadingScreen from './components/ui/LoadingScreen'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// Lazy Pages
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Home = lazy(() => import('./pages/Home'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))
const GameHub = lazy(() => import('./pages/GameHub'))
const Transactions = lazy(() => import('./pages/Transactions'))

// Games
const LudoLobby = lazy(() => import('./games/ludo/LudoLobby'))
const LudoGame = lazy(() => import('./games/ludo/LudoGame'))
const ColorPrediction = lazy(() => import('./games/color/ColorPrediction'))
const OddEven = lazy(() => import('./games/oddeven/OddEven'))
const DragonTiger = lazy(() => import('./games/dragontiger/DragonTiger'))
const AndarBahar = lazy(() => import('./games/andarbhahar/AndarBahar'))
const PokerLobby = lazy(() => import('./games/poker/PokerLobby'))
const PokerTable = lazy(() => import('./games/poker/PokerTable'))

// Admin
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./admin/AdminUsers'))
const AdminDeposits = lazy(() => import('./admin/AdminDeposits'))
const AdminWithdrawals = lazy(() => import('./admin/AdminWithdrawals'))
const AdminGames = lazy(() => import('./admin/AdminGames'))
const AdminNotifications = lazy(() => import('./admin/AdminNotifications'))

// Protected Route
const ProtectedRoute: React.FC<{ requireAdmin?: boolean }> = ({ requireAdmin = false }) => {
  const { user, userProfile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && userProfile?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

// Guest Route (redirect if already logged in)
const GuestRoute: React.FC = () => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Guest routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected user routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/games" element={<GameHub />} />
          <Route path="/transactions" element={<Transactions />} />

          {/* Games */}
          <Route path="/games/ludo" element={<LudoLobby />} />
          <Route path="/games/ludo/:roomId" element={<LudoGame />} />
          <Route path="/games/color" element={<ColorPrediction />} />
          <Route path="/games/oddeven" element={<OddEven />} />
          <Route path="/games/dragon-tiger" element={<DragonTiger />} />
          <Route path="/games/andar-bahar" element={<AndarBahar />} />
          <Route path="/games/poker" element={<PokerLobby />} />
          <Route path="/games/poker/:tableId" element={<PokerTable />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/deposits" element={<AdminDeposits />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/admin/games" element={<AdminGames />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
)

const App: React.FC = () => (
  <AuthProvider>
    <WalletProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </WalletProvider>
  </AuthProvider>
)

export default App
