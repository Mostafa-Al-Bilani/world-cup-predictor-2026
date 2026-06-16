import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getOnboardingRedirectPath, isDuplicateUsernameError, resolveOnboardingStatus } from '../utils/onboarding';
import { getSafeErrorMessage } from '../utils/errors';

export function UsernameSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    completeUsername,
    isAuthenticated,
    loading,
    profile,
    profileQueryStatus,
    championPrediction,
    championQueryStatus,
    championPredictionsOpen,
    isAdmin,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onboardingStatus = resolveOnboardingStatus({
    authLoading: loading,
    isAuthenticated,
    isAdmin,
    profile,
    profileQueryStatus,
    championQueryStatus,
    championPrediction,
    championPredictionsOpen,
    pathname: location.pathname,
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      await completeUsername(username);
      toast.success('Username saved.');

      const nextStatus = resolveOnboardingStatus({
        authLoading: false,
        isAuthenticated: true,
        isAdmin: false,
        profile: { ...profile, username },
        profileQueryStatus: 'ready',
        championQueryStatus: 'ready',
        championPrediction,
        championPredictionsOpen,
        pathname: location.pathname,
      });

      const nextPath =
        getOnboardingRedirectPath(nextStatus) ??
        location.state?.from ??
        '/matches';

      navigate(nextPath, { replace: true });
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        isDuplicateUsernameError(error)
          ? 'That username is already taken.'
          : 'Could not save your username.',
      );
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading account" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.state?.from }}
      />
    );
  }

  if (onboardingStatus.status === 'complete') {
    return <Navigate to={location.state?.from ?? '/matches'} replace />;
  }

  return (
    <main className="mx-auto grid min-h-[72vh] max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
          Account setup
        </p>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          Choose your public username
        </h1>
        <p className="mt-3 text-slate-300">
          This name appears on the scoreboard. It must be unique and cannot be
          changed later through this screen.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-300">Username</span>
            <input
              required
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              maxLength={40}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              placeholder="goldenboot"
            />
          </label>

          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving username...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
