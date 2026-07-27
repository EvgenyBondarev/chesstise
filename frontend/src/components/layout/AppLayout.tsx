import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import AuthModal from '../auth/AuthModal';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const token         = useAuthStore(s => s.token);
  const loadRunsFromApi = useProfileStore(s => s.loadRunsFromApi);

  // On mount, if a token is already stored, refresh runs from the API
  useEffect(() => {
    if (token) loadRunsFromApi();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to exercise</a>

      <div className="app-layout">
        <Sidebar onSignIn={() => setAuthOpen(true)} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
