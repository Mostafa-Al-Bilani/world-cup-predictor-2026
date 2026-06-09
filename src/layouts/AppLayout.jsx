import { Outlet } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-stadium-radial text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.1),#020617_78%)]">
        <Navbar />
        <Outlet />
        <Footer />
      </div>
    </div>
  );
}
