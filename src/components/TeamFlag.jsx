import { useState } from 'react';
import { Shield } from 'lucide-react';
import clsx from 'clsx';
import { getTeamFlagInfo } from '../utils/flags';

const sizeClasses = {
  sm: {
    box: 'h-5 w-7 rounded',
    icon: 13,
  },
  md: {
    box: 'h-7 w-10 rounded-md',
    icon: 15,
  },
  lg: {
    box: 'h-10 w-14 rounded-md',
    icon: 18,
  },
  xl: {
    box: 'h-14 w-20 rounded-lg',
    icon: 22,
  },
};

export function TeamFlag({ className, size = 'md', teamName }) {
  const [failed, setFailed] = useState(false);
  const flag = getTeamFlagInfo(teamName);
  const sizing = sizeClasses[size] ?? sizeClasses.md;

  return (
    <span
      className={clsx(
        'inline-grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-white/5 text-emerald-200 shadow-sm',
        sizing.box,
        className,
      )}
      title={flag ? `${teamName} flag` : undefined}
    >
      {flag && !failed ? (
        <img
          alt={`${teamName} flag`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={flag.imageUrl}
          onError={() => setFailed(true)}
        />
      ) : (
        <Shield size={sizing.icon} />
      )}
    </span>
  );
}
