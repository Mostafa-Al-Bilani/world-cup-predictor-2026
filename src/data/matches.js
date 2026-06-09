import scheduleCsv from './world-cup-2026-schedule.csv?raw';

const [headerLine, ...rows] = scheduleCsv.trim().split(/\r?\n/);
const headers = headerLine.split(',');

const toRecord = (line) => {
  const values = line.split(',');
  return headers.reduce((record, header, index) => {
    record[header] = values[index];
    return record;
  }, {});
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const getStatus = (date) => {
  const kickoff = new Date(date);
  const now = new Date();
  if (now < kickoff) return 'upcoming';
  return 'live';
};

export const worldCupMatches = rows.map((row) => {
  const record = toRecord(row);
  const matchNumber = Number(record.Match);
  const matchDate = `${record['Date (UTC)']}T${record['Kickoff (UTC)']}:00Z`;

  return {
    id: `wc26-${String(matchNumber).padStart(3, '0')}`,
    match_number: matchNumber,
    team_a: record['Team A'],
    team_b: record['Team B'],
    match_date: matchDate,
    stage: record['Group / Round'],
    status: getStatus(matchDate),
    team_a_score: null,
    team_b_score: null,
    result: null,
    venue: record.Venue,
    city: record.City,
    host_country: record['Host Country'],
    external_ref: `kickoffclock-${matchNumber}`,
    api_slug: slugify(`${record['Group / Round']}-${matchNumber}-${record['Team A']}-${record['Team B']}`),
    created_at: '2026-06-08T00:00:00Z',
  };
});

export const stages = Array.from(new Set(worldCupMatches.map((match) => match.stage)));
