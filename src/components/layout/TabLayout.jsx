import { Outlet } from 'react-router-dom';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';

export default function TabLayout() {
  return (
    <>
      <TopHeader />
      <main className="relative w-full min-h-dvh bg-white pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-xl mx-auto px-5 md:px-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
