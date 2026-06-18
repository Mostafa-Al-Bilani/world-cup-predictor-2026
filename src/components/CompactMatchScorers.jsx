import { useId, useState } from "react";
import {
  buildCompactScorerAriaLabel,
  GOAL_EVENT_TYPES,
} from "../utils/matchGoalEvents.js";

const VISIBLE_SCORER_LIMIT = 2;

function ScorerMetadata({ eventType }) {
  if (eventType === GOAL_EVENT_TYPES.OWN_GOAL) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {" "}
        OG
      </span>
    );
  }

  if (eventType === GOAL_EVENT_TYPES.PENALTY) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {" "}
        PEN
      </span>
    );
  }

  return null;
}

function CompactScorerEntry({ event, align = "left" }) {
  const isRightAligned = align === "right";

  return (
    <span
      className={`inline max-w-full align-top ${
        isRightAligned ? "text-right" : "text-left"
      }`}
      aria-label={buildCompactScorerAriaLabel(event)}
    >
      <span className="truncate text-slate-400" title={event.player_name}>
        {event.player_name}
      </span>
      <span className="whitespace-nowrap font-semibold text-emerald-300/90">
        {" "}
        {event.minute}
      </span>
      <ScorerMetadata eventType={event.event_type} />
    </span>
  );
}

export function CompactScorerGroup({ events, align = "left", className = "" }) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);

  if (!events.length) {
    return <div className={className} aria-hidden="true" />;
  }

  const hiddenCount = Math.max(events.length - VISIBLE_SCORER_LIMIT, 0);
  const visibleEvents = expanded
    ? events
    : events.slice(0, VISIBLE_SCORER_LIMIT);
  const isRightAligned = align === "right";

  return (
    <div
      className={`min-w-0 text-xs leading-4 ${className} ${
        isRightAligned ? "text-right" : "text-left"
      }`}
    >
      <div
        id={listId}
        className={`flex min-w-0 flex-wrap gap-x-1 gap-y-0.5 ${
          isRightAligned ? "justify-end" : "justify-start"
        } ${expanded ? "" : "line-clamp-2"}`}
      >
        {visibleEvents.map((event, index) => (
          <span
            key={`${event.player_name}-${event.minute}-${index}`}
            className="inline-flex min-w-0 max-w-full"
          >
            {index > 0 ? (
              <span className="px-0.5 text-slate-600" aria-hidden="true">
                ·
              </span>
            ) : null}
            <CompactScorerEntry event={event} align={align} />
          </span>
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          className={`mt-0.5 inline-flex min-h-6 items-center text-[11px] font-semibold text-emerald-300/85 underline-offset-2 transition hover:text-emerald-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${
            isRightAligned ? "ml-auto" : ""
          }`}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : `+${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}

export function CompactNoGoalsLabel({ className = "" }) {
  return (
    <p
      className={`text-center text-xs font-medium text-slate-500 ${className}`}
    >
      No goals
    </p>
  );
}
