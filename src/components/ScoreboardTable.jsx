import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import { getAccuracy } from '../utils/predictions';

export function ScoreboardTable({ users, currentUserId }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/72">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Username</th>
              <th className="px-5 py-4">Total points</th>
              <th className="px-5 py-4">Winner</th>
              <th className="px-5 py-4">Exact</th>
              <th className="px-5 py-4">Champion</th>
              <th className="px-5 py-4">Bracket</th>
              <th className="px-5 py-4">Correct</th>
              <th className="px-5 py-4">Finished picks</th>
              <th className="px-5 py-4">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user, index) => {
              const isCurrent = user.id === currentUserId;
              return (
                <tr key={user.id} className={clsx('transition hover:bg-white/[0.03]', isCurrent && 'bg-emerald-300/10')}>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-black text-white">
                      {index < 3 ? <Trophy size={16} className="text-gold-300" /> : null}
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-white">
                    {user.username}
                    {isCurrent ? <span className="ml-2 rounded-full bg-emerald-300 px-2 py-1 text-[10px] font-black uppercase text-emerald-950">You</span> : null}
                  </td>
                  <td className="px-5 py-4 font-black text-gold-300">{user.total_points ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">{user.match_winner_points ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">{user.exact_score_points ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">{user.champion_points ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">{user.bracket_points ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">{user.correct_predictions}</td>
                  <td className="px-5 py-4 text-slate-300">{user.total_predictions}</td>
                  <td className="px-5 py-4 text-slate-300">{getAccuracy(user)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
