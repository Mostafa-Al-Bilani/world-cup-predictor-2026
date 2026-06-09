import { useEffect, useState } from 'react';
import { formatDateTimeUtc, fromDateTimeLocalInput, getUserTimeZone, toDateTimeLocalInput } from '../utils/date';
import { getMatchResultFromScores } from '../utils/predictions';

const blankMatch = {
  team_a: '',
  team_b: '',
  match_date: '',
  stage: '',
  status: 'upcoming',
  team_a_score: '',
  team_b_score: '',
  result: '',
  venue: '',
  city: '',
  host_country: '',
};

export function AdminMatchForm({ match, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(blankMatch);
  const savedUtcPreview = fromDateTimeLocalInput(form.match_date);
  const localTimeZone = getUserTimeZone();

  useEffect(() => {
    if (!match) {
      setForm(blankMatch);
      return;
    }
    setForm({
      ...blankMatch,
      ...match,
      match_date: toDateTimeLocalInput(match.match_date),
      team_a_score: match.team_a_score ?? '',
      team_b_score: match.team_b_score ?? '',
      result: match.result ?? '',
    });
  }, [match]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'team_a_score' || name === 'team_b_score') {
        next.result = getMatchResultFromScores(next.team_a_score, next.team_b_score) ?? next.result;
      }
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      id: match?.id,
      match_date: fromDateTimeLocalInput(form.match_date),
      team_a_score: form.team_a_score === '' ? null : Number(form.team_a_score),
      team_b_score: form.team_b_score === '' ? null : Number(form.team_b_score),
      result: form.result || null,
    });
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-slate-950/72 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black">{match ? 'Edit match' : 'Add match'}</h2>
        {match ? (
          <button type="button" onClick={onCancel} className="text-sm font-bold text-slate-300 hover:text-white">
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Home / listed team" name="team_a" value={form.team_a} onChange={updateForm} maxLength={80} required />
        <Field label="Away / opponent team" name="team_b" value={form.team_b} onChange={updateForm} maxLength={80} required />
        <Field
          label={`Match date (${localTimeZone})`}
          name="match_date"
          type="datetime-local"
          value={form.match_date}
          onChange={updateForm}
          helpText={savedUtcPreview ? `Saved as ${formatDateTimeUtc(savedUtcPreview)} in Supabase.` : 'Choose a local kickoff time.'}
          required
        />
        <Field label="Stage / Group" name="stage" value={form.stage} onChange={updateForm} maxLength={80} required />
        <Select label="Status" name="status" value={form.status} onChange={updateForm}>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="halftime">Halftime</option>
          <option value="finished">Finished</option>
          <option value="postponed">Postponed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select label="Final result / winner" name="result" value={form.result} onChange={updateForm}>
          <option value="">Not set</option>
          <option value="team_a">Home/listed team wins</option>
          <option value="draw">Draw</option>
          <option value="team_b">Away/opponent team wins</option>
        </Select>
        <Field label="Home/listed score" name="team_a_score" type="number" min="0" max="99" value={form.team_a_score} onChange={updateForm} />
        <Field label="Away/opponent score" name="team_b_score" type="number" min="0" max="99" value={form.team_b_score} onChange={updateForm} />
        <Field label="Venue" name="venue" value={form.venue} onChange={updateForm} maxLength={120} />
        <Field label="City" name="city" value={form.city} onChange={updateForm} maxLength={80} />
        <Field label="Host country" name="host_country" value={form.host_country} onChange={updateForm} maxLength={80} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving...' : match ? 'Save match' : 'Add match'}
      </button>
    </form>
  );
}

function Field({ label, name, value, onChange, type = 'text', helpText, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <input
        {...props}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
      />
      {helpText ? <span className="mt-2 block text-xs leading-5 text-slate-400">{helpText}</span> : null}
    </label>
  );
}

function Select({ label, name, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
      >
        {children}
      </select>
    </label>
  );
}
