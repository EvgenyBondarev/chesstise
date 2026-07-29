import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AuthModal from '../auth/AuthModal';
import MotivationBar from './MotivationBar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [authOpen,    setAuthOpen]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to exercise</a>

      <MotivationBar />

      <div className="app-layout">
        <button
          className="sidebar-hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar
          onSignIn={() => setAuthOpen(true)}
          isOpen={sidebarOpen}
        />

        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
