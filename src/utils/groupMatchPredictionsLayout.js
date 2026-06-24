export function getGroupMatchPredictionsGridClass(matchCount) {
  const baseClass =
    "mt-5 grid grid-cols-1 items-start gap-5 min-w-0";

  if (matchCount <= 1) {
    return `${baseClass} max-w-3xl`;
  }

  return `${baseClass} lg:grid-cols-[repeat(2,minmax(0,1fr))]`;
}
