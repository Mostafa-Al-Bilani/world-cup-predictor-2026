import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function PasswordField({ label, name, value, onChange, autoComplete, placeholder = 'At least 6 characters' }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <span className="mt-2 flex rounded-lg border border-white/10 bg-white/5 transition focus-within:border-emerald-300">
        <input
          required
          minLength={6}
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 rounded-l-lg bg-transparent px-4 py-3 text-white outline-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="grid w-12 place-items-center rounded-r-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
