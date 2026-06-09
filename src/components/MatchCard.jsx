import { CalendarDays, MapPin, Shield, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PredictionButton } from './PredictionButton';
import { StatusBadge } from './StatusBadge';
import { formatDateTime, isMatchLocked } from '../utils/date';
import { getPredictionLabel, getPredictionStatus } from '../utils/predictions';

export function MatchCard({ match, prediction, onPredict, isAuthenticated, busy }) {
  const locked = isMatchLocked(match) || match.status !== 'upcoming';
  const predictionStatus = getPredictionStatus(match, prediction);

  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40">
      <div className="bg-pitch-lines bg-[length:32px_32px] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge label={match.status} />
          <StatusBadge label={predictionStatus} />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <TeamName name={match.team_a} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
            VS
          </span>
          <TeamName name={match.team_b} align="right" />
        </div>

        {match.status === 'finished' ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-black">
            {match.team_a_score ?? '-'} : {match.team_b_score ?? '-'}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-300" />
            {formatDateTime(match.match_date)}
          </span>
          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-gold-300" />
            {match.stage}
          </span>
          <span className="flex items-center gap-2 sm:col-span-2">
            <MapPin size={16} className="text-sky-300" />
            {match.venue}, {match.city}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Your prediction</p>
          <p className="mt-2 text-sm font-bold text-white">{getPredictionLabel(match, prediction?.predicted_result)}</p>
          {isAuthenticated ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <PredictionButton
                label={match.team_a}
                selected={prediction?.predicted_result === 'team_a'}
                disabled={locked || busy}
                onClick={() => onPredict(match, 'team_a')}
              />
              <PredictionButton
                label="Draw"
                selected={prediction?.predicted_result === 'draw'}
                disabled={locked || busy}
                onClick={() => onPredict(match, 'draw')}
              />
              <PredictionButton
                label={match.team_b}
                selected={prediction?.predicted_result === 'team_b'}
                disabled={locked || busy}
                onClick={() => onPredict(match, 'team_b')}
              />
            </div>
          ) : (
            <Link className="mt-4 inline-flex text-sm font-bold text-emerald-300 hover:text-white" to="/login">
              Log in to predict
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function TeamName({ name, align = 'left' }) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <span className="mb-2 inline-grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/5 text-emerald-200">
        <Shield size={20} />
      </span>
      <h3 className="text-lg font-black text-white sm:text-xl">{name}</h3>
    </div>
  );
}
