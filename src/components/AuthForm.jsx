import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PasswordField } from './PasswordField';
import { TeamPicker } from './TeamPicker';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { championService } from '../services/championService';
import { rememberPendingChampionPick } from '../utils/championPick';
import { getSafeErrorMessage } from '../utils/errors';

export function AuthForm({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, isDemoMode } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    champion: '',
  });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const formRef = useRef(null);
  const firstInputRef = useRef(null);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (!isRegister) return undefined;

    let cancelled = false;

    championService
      .getAvailableTeams()
      .then((rows) => {
        if (cancelled) return;

        setTeams(rows);
        setForm((current) => ({
          ...current,
          champion: current.champion || rows[0] || '',
        }));
      })
      .catch((error) => {
        toast.error(getSafeErrorMessage(error, 'Could not load World Cup teams.'));
      });

    return () => {
      cancelled = true;
    };
  }, [isRegister]);

  useEffect(() => {
    const shouldFocusAuth =
      location.state?.scrollToAuth ||
      window.matchMedia('(max-width: 1023px)').matches;

    if (!shouldFocusAuth) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => firstInputRef.current?.focus({ preventScroll: true }), 350);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.state?.scrollToAuth, mode]);

  const updateForm = (event) => {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setPendingConfirmationEmail('');
    setSuccessMessage('');

    try {
      if (isRegister) {
        const result = await signUp(form);
        if (result?.needsEmailConfirmation) {
          rememberPendingChampionPick({ email: form.email, team: form.champion });
          setPendingConfirmationEmail(form.email);
          const message = 'Account created. Check your email to confirm it, then log in and lock your champion pick.';
          setSuccessMessage(message);
          toast.success('Check your email to confirm your account.');
          return;
        }
        toast.success('Account created.');
      } else {
        await signIn(form);
        toast.success('Logged in successfully.');
      }

      navigate(location.state?.from ?? '/matches', { replace: true });
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        'Authentication failed. Check your email and password.',
      );

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    if (!pendingConfirmationEmail) return;

    setResendingConfirmation(true);
    setErrorMessage('');

    try {
      await authService.resendConfirmationEmail(pendingConfirmationEmail);
      const message = 'Confirmation email sent again. Check your inbox and spam folder.';
      setSuccessMessage(message);
      toast.success('Confirmation email sent again.');
    } catch (error) {
      const message = getSafeErrorMessage(error, 'Could not resend the confirmation email yet.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[72vh] w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-8">
      <div className="min-w-0 max-w-[calc(100vw-2rem)] lg:max-w-none">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
          {isRegister ? 'Join the prediction table' : 'Back to the pitch'}
        </p>

        <h1 className="mt-4 text-4xl font-black sm:text-6xl">
          {isRegister ? 'Create your tournament account.' : 'Log in and lock your calls.'}
        </h1>

        <p className="mt-5 max-w-xl text-slate-300">
          Predict match outcomes, earn one point per correct result, and climb a public scoreboard built for the full 2026 schedule.
        </p>

        {isDemoMode ? (
          <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            Local demo mode is active because Supabase environment variables are not configured. Use any email to explore; include
            &quot;admin&quot; in the email to preview the admin dashboard locally.
          </div>
        ) : null}
      </div>

      <form
        ref={formRef}
        onSubmit={submit}
        className="w-full min-w-0 max-w-[calc(100vw-2rem)] scroll-mt-24 rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl backdrop-blur lg:max-w-none"
      >
        <h2 className="text-2xl font-black">{isRegister ? 'Register' : 'Log in'}</h2>

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            <p>{successMessage}</p>
            {pendingConfirmationEmail ? (
              <button
                type="button"
                disabled={resendingConfirmation}
                onClick={resendConfirmationEmail}
                className="mt-3 rounded-full border border-emerald-200/40 px-4 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-200 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingConfirmation ? 'Sending...' : 'Resend confirmation email'}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {isRegister ? (
            <label className="block min-w-0">
              <span className="text-sm font-bold text-slate-300">Username</span>
              <input
                required
                name="username"
                value={form.username}
                onChange={updateForm}
                ref={isRegister ? firstInputRef : undefined}
                autoComplete="username"
                maxLength={40}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                placeholder="goldenboot"
              />
            </label>
          ) : null}

          <label className="block min-w-0">
            <span className="text-sm font-bold text-slate-300">Email</span>
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              ref={isRegister ? undefined : firstInputRef}
              autoComplete="email"
              maxLength={254}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              placeholder="you@example.com"
            />
          </label>

          <PasswordField
            label="Password"
            name="password"
            value={form.password}
            onChange={updateForm}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder={isRegister ? undefined : 'Your password'}
            minLength={isRegister ? undefined : 1}
          />

          {isRegister ? (
            <TeamPicker
              label="World Cup winner pick"
              name="champion"
              teams={teams}
              value={form.champion}
              onChange={(team) => setForm((current) => ({ ...current, champion: team }))}
              helperText={
                isDemoMode
                  ? 'Correct champion prediction gives 3 points and locks after selection.'
                  : 'If email confirmation is enabled, this pick is saved after you confirm and log in.'
              }
            />
          ) : null}
        </div>

        <button
          disabled={loading || (isRegister && !form.champion)}
          type="submit"
          className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
        </button>

        {!isRegister ? (
          <p className="mt-4 text-center text-sm">
            <Link className="font-bold text-emerald-300 hover:text-white" to="/forgot-password">
              Forgot your password?
            </Link>
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegister ? 'Already have an account?' : 'New to the league?'}{' '}
          <Link className="font-bold text-emerald-300 hover:text-white" to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Log in' : 'Register'}
          </Link>
        </p>
      </form>
    </div>
  );
}
