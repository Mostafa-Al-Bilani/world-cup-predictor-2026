const readKickoffTime = (matchDate) => {
  if (matchDate === null || matchDate === undefined || matchDate === "") {
    return null;
  }

  const kickoff = new Date(matchDate).getTime();
  return Number.isFinite(kickoff) ? kickoff : null;
};

const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"}`;

const formatAriaDuration = ({ hours, minutes, seconds, mode }) => {
  if (mode === "hours") {
    if (minutes > 0) {
      return `${pluralize(hours, "hour")} and ${pluralize(minutes, "minute")}`;
    }

    return pluralize(hours, "hour");
  }

  if (mode === "minutes") {
    if (seconds > 0) {
      return `${pluralize(minutes, "minute")} and ${pluralize(seconds, "second")}`;
    }

    return pluralize(minutes, "minute");
  }

  return pluralize(seconds, "second");
};

export const formatKickoffCountdown = (matchDate, now = Date.now()) => {
  const kickoffTime = readKickoffTime(matchDate);
  if (kickoffTime === null) {
    return null;
  }

  const diffMs = kickoffTime - now;
  if (diffMs <= 0) {
    return {
      text: "Starting now",
      ariaLabel: "Starting now",
      expired: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 1) {
    const timePart = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

    return {
      text: `Starts in ${timePart}`,
      ariaLabel: `Kickoff in ${formatAriaDuration({ hours, minutes, mode: "hours" })}`,
      expired: false,
    };
  }

  if (minutes >= 1) {
    const timePart = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;

    return {
      text: `Starts in ${timePart}`,
      ariaLabel: `Kickoff in ${formatAriaDuration({ minutes, seconds, mode: "minutes" })}`,
      expired: false,
    };
  }

  return {
    text: `Starts in ${seconds}s`,
    ariaLabel: `Kickoff in ${formatAriaDuration({ seconds, mode: "seconds" })}`,
    expired: false,
  };
};
