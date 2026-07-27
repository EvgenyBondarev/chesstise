import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../store/authStore';

function decodeGoogleJwt(token: string): { name?: string; email?: string } {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const [nickname, setNickname] = useState('');
  const [error,    setError]    = useState('');
  const authLogin = useAuthStore(s => s.login);

  if (!open) return null;

  const finishAuth = (token: string, displayName: string) => {
    authLogin(token, displayName);
    onClose();
  };

  const handleNickname = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) { setError('Enter a name.'); return; }
    finishAuth('local-' + Date.now(), name);
  };

  return (
    <div className="auth-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

        <h2 className="auth-title">Sign in</h2>

        <div className="auth-google">
          <GoogleLogin
            shape="rectangular"
            theme="filled_black"
            size="large"
            width="100%"
            onSuccess={cr => {
              if (!cr.credential) return;
              const { name, email } = decodeGoogleJwt(cr.credential);
              finishAuth(cr.credential, name || email || 'Google User');
            }}
            onError={() => setError('Google sign-in failed. Use the name field below.')}
          />
        </div>

        <div className="auth-divider"><span>or set a display name</span></div>

        <form className="auth-form" onSubmit={handleNickname} noValidate>
          <label className="auth-label">
            Your name
            <input
              className="auth-input"
              type="text"
              placeholder="e.g. Magnus"
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              autoComplete="nickname"
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="game-btn auth-submit" type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}
