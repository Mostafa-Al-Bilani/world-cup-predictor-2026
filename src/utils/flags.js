const SUBDIVISION_FLAGS = {
  england: { code: 'gb-eng', emojiTag: 'gbeng' },
  scotland: { code: 'gb-sct', emojiTag: 'gbsct' },
  wales: { code: 'gb-wls', emojiTag: 'gbwls' },
};

const COUNTRY_CODES = {
  algeria: 'DZ',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  'bosnia & herzegovina': 'BA',
  'bosnia and herzegovina': 'BA',
  brazil: 'BR',
  canada: 'CA',
  'cape verde': 'CV',
  colombia: 'CO',
  'dr congo': 'CD',
  'congo dr': 'CD',
  'democratic republic of congo': 'CD',
  'democratic republic of the congo': 'CD',
  croatia: 'HR',
  cuba: 'CU',
  curacao: 'CW',
  czechia: 'CZ',
  ecuador: 'EC',
  egypt: 'EG',
  france: 'FR',
  germany: 'DE',
  ghana: 'GH',
  haiti: 'HT',
  iran: 'IR',
  iraq: 'IQ',
  italy: 'IT',
  "cote d'ivoire": 'CI',
  'ivory coast': 'CI',
  jamaica: 'JM',
  japan: 'JP',
  jordan: 'JO',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  'new zealand': 'NZ',
  norway: 'NO',
  panama: 'PA',
  paraguay: 'PY',
  portugal: 'PT',
  qatar: 'QA',
  'saudi arabia': 'SA',
  senegal: 'SN',
  'south africa': 'ZA',
  'south korea': 'KR',
  'korea republic': 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tunisia: 'TN',
  turkiye: 'TR',
  turkey: 'TR',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  uruguay: 'UY',
  uzbekistan: 'UZ',
};

const PLACEHOLDER_PATTERN =
  /^(?:tbd|[123][a-l](?:\/[a-l])*|[a-l][123]?|w\d+|l\d+|group\s+[a-l]\s+(?:1st|2nd|3rd)\s+place|round\s+of\s+\d+\s+\d+\s+winner|round\s+of\s+\d+\s+\d+\s+loser|quarterfinal\s+\d+\s+winner|quarterfinal\s+\d+\s+loser|semifinal\s+\d+\s+winner|semifinal\s+\d+\s+loser)$/i;

const normalizeTeamName = (teamName) =>
  String(teamName ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const subdivisionFlag = (tag) =>
  String.fromCodePoint(
    0x1f3f4,
    ...tag
      .toLowerCase()
      .split('')
      .map((character) => 0xe0061 + character.charCodeAt(0) - 97),
    0xe007f,
  );

const countryCodeToFlag = (code) =>
  code
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('');

export const getTeamFlagInfo = (teamName) => {
  const name = String(teamName ?? '').trim();
  if (!name || PLACEHOLDER_PATTERN.test(name)) return null;

  const normalizedName = normalizeTeamName(name);
  const subdivision = SUBDIVISION_FLAGS[normalizedName];
  if (subdivision) {
    return {
      code: subdivision.code,
      emoji: subdivisionFlag(subdivision.emojiTag),
      imageUrl: `https://flagcdn.com/${subdivision.code}.svg`,
      name,
    };
  }

  const code = COUNTRY_CODES[normalizedName];
  if (!code) return null;

  return {
    code,
    emoji: countryCodeToFlag(code),
    imageUrl: `https://flagcdn.com/${code.toLowerCase()}.svg`,
    name,
  };
};

export const getTeamFlag = (teamName) => getTeamFlagInfo(teamName)?.emoji ?? null;
