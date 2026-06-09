import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, signOut, clearPasswordRecovery } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateForm = (event) => {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await authService.updatePassword(form.password);
      clearPasswordRecovery();
      await signOut();
      toast.success('Password updated. Log in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error.message ?? 'Could not update password.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[72vh] max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Recovery link required</p>
          <h1 className="mt-4 text-4xl font-black">Request a reset link first.</h1>
          <p className="mt-4 text-slate-300">
            Password changes require the secure link from your email. Request a new link and open it in this browser.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
            to="/forgot-password"
          >
            Request reset link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Choose a new password</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">You are back in control.</h1>
        <p className="mt-5 max-w-xl text-slate-300">
          Set a new password, then log in again to continue making your predictions.
        </p>
      </section>

      <form onSubmit={submit} className="rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl backdrop-blur">
        <h2 className="text-2xl font-black">Update password</h2>
        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-6 space-y-4">
          <PasswordField
            label="New password"
            name="password"
            value={form.password}
            onChange={updateForm}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={updateForm}
            autoComplete="new-password"
            placeholder="Repeat the new password"
          />
        </div>
        <button
          disabled={saving || loading}
          type="submit"
          className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
