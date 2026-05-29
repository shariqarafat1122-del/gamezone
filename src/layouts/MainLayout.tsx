import { ReactNode } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export const MainLayout = ({ children, hideBottomNav = false }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />
      <main className="pt-16 pb-20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};
