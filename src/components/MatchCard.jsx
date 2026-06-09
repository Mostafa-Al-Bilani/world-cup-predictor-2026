import { CalendarDays, MapPin, Shield, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PredictionButton } from './PredictionButton';
import { StatusBadge } from './StatusBadge';
import { formatDateTime, isMatchLocked } from '../utils/date';
import {
  getPredictedScoreLabel,
  getPredictionLabel,
  getPredictionModeLabel,
  getPredictionStatus,
  getPredictionTotalPoints,
  matchAllowsDraw,
} from '../utils/predictions';
import { getTeamFlag } from '../utils/flags';

export function MatchCard({ match, prediction, onPredict, isAuthenticated, busy }) {
  const locked = isMatchLocked(match) || match.status !== 'upcoming';
  const canDraw = matchAllowsDraw(match);
  const predictionStatus = getPredictionStatus(match, prediction);
  const [draft, setDraft] = useState({ result: '', homeScore: '', awayScore: '' });
  const teamAFlag = getTeamFlag(match.team_a);
  const teamBFlag = getTeamFlag(match.team_b);
  const teamALabel = teamAFlag ? `${teamAFlag} ${match.team_a}` : match.team_a;
  const teamBLabel = teamBFlag ? `${teamBFlag} ${match.team_b}` : match.team_b;

  useEffect(() => {
    setDraft({
      result: prediction?.predicted_result ?? '',
      homeScore: prediction?.predicted_home_score ?? '',
      awayScore: prediction?.predicted_away_score ?? '',
    });
  }, [prediction?.predicted_away_score, prediction?.predicted_home_score, prediction?.predicted_result]);

  const savePrediction = (nextResult = draft.result) => {
    onPredict(match, nextResult, {
      predictedHomeScore: draft.homeScore,
      predictedAwayScore: draft.awayScore,
    });
  };

  const selectResult = (result) => {
    setDraft((current) => ({ ...current, result }));
    savePrediction(result);
  };

  const updateScore = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

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
          <TeamName name={match.team_a} flag={teamAFlag} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
            VS
          </span>
          <TeamName name={match.team_b} flag={teamBFlag} align="right" />
        </div>

        {match.status === 'finished' || match.status === 'live' || match.status === 'halftime' ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-black">
            {match.team_a_score ?? '-'} : {match.team_b_score ?? '-'}
            {match.status === 'live' && match.elapsed ? (
              <span className="ml-2 align-middle text-xs font-bold text-emerald-200">{match.elapsed} min</span>
            ) : null}
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
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{getPredictionModeLabel(match)}</p>
          <p className="mt-2 text-sm font-bold text-white">{getPredictionLabel(match, prediction?.predicted_result)}</p>
          <p className="mt-1 text-sm text-slate-300">Score pick: {getPredictedScoreLabel(prediction)}</p>
          {isAuthenticated ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <PredictionButton
                  label={teamALabel}
                  selected={draft.result === 'team_a'}
                  disabled={locked || busy}
                  onClick={() => selectResult('team_a')}
                />
                {canDraw ? (
                  <PredictionButton
                    label="Draw"
                    selected={draft.result === 'draw'}
                    disabled={locked || busy}
                    onClick={() => selectResult('draw')}
                  />
                ) : null}
                <PredictionButton
                  label={teamBLabel}
                  selected={draft.result === 'team_b'}
                  disabled={locked || busy}
                  onClick={() => selectResult('team_b')}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_84px_84px] sm:items-end">
                <p className="text-xs leading-5 text-slate-400">
                  Optional exact-score bonus: enter both scores for a chance at +1 extra point.
                </p>
                <ScoreInput
                  label={match.team_a}
                  value={draft.homeScore}
                  disabled={locked || busy}
                  onChange={(value) => updateScore('homeScore', value)}
                />
                <ScoreInput
                  label={match.team_b}
                  value={draft.awayScore}
                  disabled={locked || busy}
                  onChange={(value) => updateScore('awayScore', value)}
                />
              </div>

              <button
                type="button"
                disabled={locked || busy || !draft.result}
                onClick={() => savePrediction()}
                className="w-full rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Saving...' : 'Save prediction'}
              </button>
            </div>
          ) : (
            <Link className="mt-4 inline-flex text-sm font-bold text-emerald-300 hover:text-white" to="/login">
              Log in to predict
            </Link>
          )}

          {match.status === 'finished' && prediction ? (
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <PointPill label="Winner" value={prediction.winner_points ?? Number(prediction.is_correct === true)} />
              <PointPill label="Exact bonus" value={prediction.exact_score_points ?? 0} />
              <PointPill label="Total" value={getPredictionTotalPoints(prediction)} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ScoreInput({ label, value, disabled, onChange }) {
  return (
    <label className="block">
      <span className="block truncate text-xs font-bold text-slate-400">{label}</span>
      <input
        type="number"
        min="0"
        max="99"
        step="1"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-black text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="0"
      />
    </label>
  );
}

function PointPill({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-950/70 px-3 py-2 text-center">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function TeamName({ name, flag, align = 'left' }) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <span className="mb-2 inline-grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/5 text-emerald-200">
        {flag ? <span className="text-2xl leading-none">{flag}</span> : <Shield size={20} />}
      </span>
      <h3 className="text-lg font-black text-white sm:text-xl">{name}</h3>
    </div>
  );
}
