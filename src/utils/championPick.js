const PENDING_CHAMPION_PICK_KEY = 'wc26-pending-champion-pick';

export const rememberPendingChampionPick = ({ email, team }) => {
  if (!email || !team) return;
  try {
    window.sessionStorage.setItem(
      PENDING_CHAMPION_PICK_KEY,
      JSON.stringify({
        email: email.trim().toLowerCase(),
        team,
        createdAt: new Date().toISOString(),
      }),
    );
  } catch {
    // This convenience cache is not required for the authenticated champion pick flow.
  }
};

export const readPendingChampionPick = (email, teams = []) => {
  if (!email) return '';

  try {
    const pending = JSON.parse(window.sessionStorage.getItem(PENDING_CHAMPION_PICK_KEY) ?? 'null');
    if (pending?.email !== email.trim().toLowerCase()) return '';
    return teams.includes(pending.team) ? pending.team : '';
  } catch {
    return '';
  }
};

export const clearPendingChampionPick = () => {
  try {
    window.sessionStorage.removeItem(PENDING_CHAMPION_PICK_KEY);
  } catch {
    // Ignore storage failures; the server-side locked pick is the source of truth.
  }
};
