import { isPlaceholderTeamName } from "./matches.js";

const TEAM_ALIAS_TO_CANONICAL = new Map([
  ["usa", "United States"],
  ["us", "United States"],
  ["united states of america", "United States"],
  ["united states", "United States"],
  ["korea republic", "Korea Republic"],
  ["south korea", "Korea Republic"],
  ["korea dpr", "Korea DPR"],
  ["north korea", "Korea DPR"],
  ["cote d ivoire", "Côte d'Ivoire"],
  ["cote divoire", "Côte d'Ivoire"],
  ["ivory coast", "Côte d'Ivoire"],
  ["czech republic", "Czechia"],
  ["turkiye", "Türkiye"],
  ["turkey", "Türkiye"],
  ["curacao", "Curaçao"],
  ["democratic republic of the congo", "DR Congo"],
  ["dr congo", "DR Congo"],
  ["bosnia and herzegovina", "Bosnia and Herzegovina"],
  ["cape verde", "Cape Verde"],
  ["saudi arabia", "Saudi Arabia"],
  ["new zealand", "New Zealand"],
  ["south africa", "South Africa"],
]);

export const normalizeTeamKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.+/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");

export const isRealTeam = (teamValue) => !isPlaceholderTeamName(teamValue);

export const resolveCanonicalTeamName = (teamValue) => {
  const raw = String(teamValue ?? "").trim();
  if (!isRealTeam(raw)) return null;

  const normalized = normalizeTeamKey(raw);
  const aliasMatch = TEAM_ALIAS_TO_CANONICAL.get(normalized);
  if (aliasMatch) return aliasMatch;

  return raw;
};

export const getTeamSlug = (teamValue) => {
  const canonical = resolveCanonicalTeamName(teamValue);
  if (!canonical) return null;

  return normalizeTeamKey(canonical)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const isSameTeam = (firstTeam, secondTeam) => {
  const first = resolveCanonicalTeamName(firstTeam);
  const second = resolveCanonicalTeamName(secondTeam);

  if (!first || !second) return false;

  return normalizeTeamKey(first) === normalizeTeamKey(second);
};

export const getCanonicalTeam = (teamValue) => {
  const name = resolveCanonicalTeamName(teamValue);
  if (!name) return null;

  const slug = getTeamSlug(name);
  if (!slug) return null;

  return { name, slug };
};

const extractGroupLabel = (stage) => {
  const text = String(stage ?? "").trim();
  const match = text.match(/group\s+([a-z0-9]+)/i);
  return match?.[1] ? `Group ${match[1].toUpperCase()}` : null;
};

export const buildTeamRegistry = (matches = []) => {
  const registry = new Map();

  matches.forEach((match) => {
    [match?.team_a, match?.team_b].forEach((teamValue) => {
      const canonical = getCanonicalTeam(teamValue);
      if (!canonical) return;

      const existing = registry.get(canonical.slug) ?? {
        ...canonical,
        group: null,
      };

      const groupLabel = extractGroupLabel(match?.stage);
      if (groupLabel && !existing.group) {
        existing.group = groupLabel;
      }

      registry.set(canonical.slug, existing);
    });
  });

  return [...registry.values()].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
};

export const getTeamBySlug = (teamSlug, matches = []) => {
  const normalizedSlug = String(teamSlug ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedSlug) return null;

  return (
    buildTeamRegistry(matches).find((team) => team.slug === normalizedSlug) ??
    null
  );
};

export const matchInvolvesTeam = (match, team) =>
  isSameTeam(match?.team_a, team) || isSameTeam(match?.team_b, team);

export const getTeamSideInMatch = (match, team) => {
  if (isSameTeam(match?.team_a, team)) return "team_a";
  if (isSameTeam(match?.team_b, team)) return "team_b";
  return null;
};

export const getOpponentInMatch = (match, team) => {
  const side = getTeamSideInMatch(match, team);
  if (side === "team_a") return match?.team_b ?? null;
  if (side === "team_b") return match?.team_a ?? null;
  return null;
};

export const getTeamMatches = (matches, team) =>
  matches.filter(
    (match) =>
      matchInvolvesTeam(match, team) &&
      isRealTeam(match?.team_a) &&
      isRealTeam(match?.team_b),
  );
