const subdivisionFlag = (tag) =>
  String.fromCodePoint(
    0x1f3f4,
    ...tag
      .toLowerCase()
      .split('')
      .map((character) => 0xe0061 + character.charCodeAt(0) - 97),
    0xe007f,
  );

const DIRECT_FLAGS = {
  England: subdivisionFlag('gbeng'),
  Scotland: subdivisionFlag('gbsct'),
  Wales: subdivisionFlag('gbwls'),
};

const COUNTRY_CODES = {
  Algeria: 'DZ',
  Argentina: 'AR',
  Australia: 'AU',
  Austria: 'AT',
  Belgium: 'BE',
  'Bosnia & Herzegovina': 'BA',
  'Bosnia and Herzegovina': 'BA',
  Brazil: 'BR',
  Canada: 'CA',
  'Cape Verde': 'CV',
  Colombia: 'CO',
  Croatia: 'HR',
  Cuba: 'CU',
  Curaçao: 'CW',
  Curacao: 'CW',
  Czechia: 'CZ',
  Ecuador: 'EC',
  Egypt: 'EG',
  France: 'FR',
  Germany: 'DE',
  Ghana: 'GH',
  Haiti: 'HT',
  Iran: 'IR',
  Iraq: 'IQ',
  Italy: 'IT',
  'Ivory Coast': 'CI',
  Jamaica: 'JM',
  Japan: 'JP',
  Jordan: 'JO',
  Mexico: 'MX',
  Morocco: 'MA',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Norway: 'NO',
  Panama: 'PA',
  Paraguay: 'PY',
  Portugal: 'PT',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  Senegal: 'SN',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Spain: 'ES',
  Sweden: 'SE',
  Switzerland: 'CH',
  Tunisia: 'TN',
  Türkiye: 'TR',
  Turkiye: 'TR',
  Turkey: 'TR',
  'United States': 'US',
  Uruguay: 'UY',
  Uzbekistan: 'UZ',
};

const PLACEHOLDER_PATTERN =
  /^(?:tbd|[123][a-l](?:\/[a-l])*|[a-l][123]?|w\d+|l\d+|group\s+[a-l]\s+(?:1st|2nd|3rd)\s+place|round\s+of\s+\d+\s+\d+\s+winner|round\s+of\s+\d+\s+\d+\s+loser|quarterfinal\s+\d+\s+winner|quarterfinal\s+\d+\s+loser|semifinal\s+\d+\s+winner|semifinal\s+\d+\s+loser)$/i;

const countryCodeToFlag = (code) =>
  code
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('');

export const getTeamFlag = (teamName) => {
  const name = String(teamName ?? '').trim();
  if (!name || PLACEHOLDER_PATTERN.test(name)) return null;
  if (DIRECT_FLAGS[name]) return DIRECT_FLAGS[name];

  const code = COUNTRY_CODES[name];
  return code ? countryCodeToFlag(code) : null;
};
