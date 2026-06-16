import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rememberOAuthReturnTo } from '../utils/authRedirect';
import { getSafeErrorMessage } from '../utils/errors';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({ redirectPath = '/login' }) {
  const location = useLocation();
  const { isDemoMode, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const startGoogleSignIn = async () => {
    if (loading || isDemoMode) return;

    setLoading(true);
    setErrorMessage('');

    try {
      rememberOAuthReturnTo(location.state?.from);
      await signInWithGoogle({ redirectPath });
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        'Could not start Google sign-in. Try again.',
      );
      setErrorMessage(message);
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div>
      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading || isDemoMode}
        onClick={startGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? 'Connecting to Google...' : 'Continue with Google'}
      </button>

      {isDemoMode ? (
        <p className="mt-2 text-center text-xs text-slate-400">
          Google sign-in is available when Supabase is configured.
        </p>
      ) : null}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        or
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
