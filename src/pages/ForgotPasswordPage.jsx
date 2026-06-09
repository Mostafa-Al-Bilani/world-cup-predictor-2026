import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { getSafeErrorMessage } from '../utils/errors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      await authService.sendPasswordResetEmail(email);
      setSent(true);
      toast.success('Password reset email sent.');
    } catch (error) {
      const message = getSafeErrorMessage(error, 'Could not send a password reset email.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[72vh] w-full max-w-5xl grid-cols-[minmax(0,1fr)] items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <section className="min-w-0 max-w-[calc(100vw-2rem)] lg:max-w-none">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Account recovery</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">Reset your password.</h1>
        <p className="mt-5 max-w-xl text-slate-300">
          Enter your account email and Supabase will send a secure recovery link. After opening it, you can choose a new
          password.
        </p>
      </section>

      <form
        onSubmit={submit}
        className="w-full min-w-0 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl backdrop-blur lg:max-w-none"
      >
        <h2 className="text-2xl font-black">Forgot password</h2>
        {sent ? (
          <div className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Check your email for the reset link. It may take a minute to arrive.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
        <label className="mt-6 block min-w-0">
          <span className="text-sm font-bold text-slate-300">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            placeholder="you@example.com"
          />
        </label>
        <button
          disabled={loading}
          type="submit"
          className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">
          Remembered it?{' '}
          <Link className="font-bold text-emerald-300 hover:text-white" to="/login">
            Back to login
          </Link>
        </p>
      </form>
    </main>
  );
}
