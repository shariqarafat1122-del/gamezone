// src/App.tsx - COMPLETE FILE WITH CORRECT IMPORTS
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WalletProvider } from './context/WalletContext'
import { NotificationProvider } from './context/NotificationContext'
import { useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// ─── Splash ───────────────────────────────────────────────
const SplashScreen = lazy(() => import('./pages/SplashScreen'))

// ─── Auth ─────────────────────────────────────────────────
const AuthPage = lazy(() => import('./pages/AuthPage'))

// ─── Main Pages ───────────────────────────────────────────
const HomePage = lazy(() => import('./pages/HomePage'))
const WalletPage = lazy(() => import('./pages/WalletPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const GameHub = lazy(() => import('./pages/GameHub'))
const GamesPage = lazy(() => import('./pages/GamesPage'))

// ─── Games ────────────────────────────────────────────────
const LudoLobby = lazy(() => import('./games/ludo/LudoLobby'))
const LudoGame = lazy(() => import('./games/ludo/LudoGame'))
const ColorPrediction = lazy(() => import('./games/color/ColorPrediction'))
const OddEven = lazy(() => import('./games/oddeven/OddEven'))
const DragonTiger = lazy(() => import('./games/dragontiger/DragonTiger'))
const AndarBahar = lazy(() => import('./games/andarbhahar/AndarBahar'))
const PokerLobby = lazy(() => import('./games/poker/PokerLobby'))
const PokerTable = lazy(() => import('./games/poker/PokerTable'))

// ─── Admin ────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./admin/AdminUsers'))
const AdminDeposits = lazy(() => import('./admin/AdminDeposits'))
const AdminWithdrawals = lazy(() => import('./admin/AdminWithdrawals'))
const AdminGames = lazy(() => import('./admin/AdminGames'))
const AdminNotifications = lazy(() => import('./admin/AdminNotifications'))

// ─── Loading Fallback ─────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
      <p className="text-white/30 text-sm">Loading...</p>
    </div>
  </div>
)

// ─── Protected Route ──────────────────────────────────────
const ProtectedRoute: React.FC<{ requireAdmin?: boolean }> = ({
  requireAdmin = false
}) => {
  const { user, userProfile, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth" replace />
  if (requireAdmin && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

// ─── Guest Route ──────────────────────────────────────────
const GuestRoute: React.FC = () => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

// ─── Routes ───────────────────────────────────────────────
const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>

      {/* Guest only */}
      <Route element={<GuestRoute />}>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
      </Route>

      {/* Protected user routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>

          {/* Home */}
          <Route path="/" element={<HomePage />} />

          {/* Pages */}
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/games" element={<GamesPage />} />

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

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  </Suspense>
)

// ─── Root App ─────────────────────────────────────────────
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
