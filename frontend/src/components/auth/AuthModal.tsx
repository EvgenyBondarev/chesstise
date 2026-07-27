import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { login as apiLogin, register as apiRegister, googleSignIn } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register';

export default function AuthModal({ open, onClose }: Props) {
  const [mode, setMode]           = useState<Mode>('login');
  const [email, setEmail]         = useState('');
  const [displayName, setDisplay] = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const authLogin       = useAuthStore(s => s.login);
  const loadRunsFromApi = useProfileStore(s => s.loadRunsFromApi);

  if (!open) return null;

  const reset      = () => { setEmail(''); setDisplay(''); setPassword(''); setError(''); };
  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const finishAuth = async (token: string, displayName: string) => {
    authLogin(token, displayName);
    await loadRunsFromApi();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, displayName, password);
      await finishAuth(res.token, res.displayName);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      setError(typeof msg === 'string' ? msg : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" onClick={onClose} role="dialog" aria-modal="true"
      aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'}
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'register'}
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}>Register</button>
        </div>

        {/* Google sign-in */}
        <div className="auth-google">
          <GoogleLogin
            text={mode === 'login' ? 'signin_with' : 'signup_with'}
            shape="rectangular"
            theme="filled_black"
            size="large"
            width="100%"
            onSuccess={async cr => {
              if (!cr.credential) return;
              setError('');
              setLoading(true);
              try {
                const res = await googleSignIn(cr.credential);
                await finishAuth(res.token, res.displayName);
              } catch {
                setError('Google sign-in failed.');
              } finally {
                setLoading(false);
              }
            }}
            onError={() => setError('Google sign-in failed.')}
          />
        </div>

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label">
            Email
            <input className="auth-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          </label>

          {mode === 'register' && (
            <label className="auth-label">
              Display name
              <input className="auth-input" type="text" value={displayName}
                onChange={e => setDisplay(e.target.value)} required autoComplete="nickname" />
            </label>
          )}

          <label className="auth-label">
            Password
            <input className="auth-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="game-btn auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
