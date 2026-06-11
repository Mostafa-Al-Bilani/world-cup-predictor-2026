import clsx from "clsx";

const teamFlagCodes = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Bahrain: "bh",
  Belgium: "be",
  Bolivia: "bo",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Bulgaria: "bg",
  Cameroon: "cm",
  Canada: "ca",
  "Cape Verde": "cv",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  "Costa Rica": "cr",
  Croatia: "hr",
  Curaçao: "cw",
  Curacao: "cw",
  Czechia: "cz",
  "Czech Republic": "cz",
  Denmark: "dk",
  "DR Congo": "cd",
  "Democratic Republic of the Congo": "cd",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Greece: "gr",
  Haiti: "ht",
  Honduras: "hn",
  Hungary: "hu",
  Iceland: "is",
  Iran: "ir",
  Iraq: "iq",
  Ireland: "ie",
  Italy: "it",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  "Cote d'Ivoire": "ci",
  Jamaica: "jm",
  Japan: "jp",
  Jordan: "jo",
  "Korea Republic": "kr",
  "South Korea": "kr",
  "Korea DPR": "kp",
  "North Korea": "kp",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nigeria: "ng",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Peru: "pe",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  Romania: "ro",
  Russia: "ru",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  Serbia: "rs",
  Slovakia: "sk",
  Slovenia: "si",
  "South Africa": "za",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Türkiye: "tr",
  Ukraine: "ua",
  Uruguay: "uy",
  USA: "us",
  "United States": "us",
  Uzbekistan: "uz",
  Venezuela: "ve",
  Wales: "gb-wls",
};

const normalizedTeamFlagCodes = Object.fromEntries(
  Object.entries(teamFlagCodes).map(([team, code]) => [
    normalizeTeamName(team),
    code,
  ]),
);

const simpleSizeStyles = {
  sm: "text-[1.35rem]",
  md: "text-[1.75rem]",
  lg: "text-[2.05rem]",
  xl: "text-[2.35rem]",
};

const premiumSizeStyles = {
  sm: {
    wrapper: "h-10 w-14 rounded-2xl",
    flag: "text-[2.1rem]",
  },
  md: {
    wrapper: "h-14 w-[4.5rem] rounded-2xl",
    flag: "text-[2.8rem]",
  },
  lg: {
    wrapper: "h-16 w-[5.2rem] rounded-3xl",
    flag: "text-[3.3rem]",
  },
  xl: {
    wrapper: "h-[5.25rem] w-[7rem] rounded-3xl",
    flag: "text-[4.35rem]",
  },
};

export function TeamFlag({
  teamName,
  size = "md",
  className,
  variant = "simple",
}) {
  const flagCode = getFlagCode(teamName);

  if (variant === "premium") {
    return (
      <PremiumFlag
        teamName={teamName}
        flagCode={flagCode}
        size={size}
        className={className}
      />
    );
  }

  return (
    <SimpleFlag
      teamName={teamName}
      flagCode={flagCode}
      size={size}
      className={className}
    />
  );
}

function SimpleFlag({ teamName, flagCode, size, className }) {
  if (!flagCode) {
    return (
      <span
        className={clsx(
          "inline-flex h-7 min-w-8 shrink-0 items-center justify-center text-xs font-black uppercase tracking-widest text-slate-300",
          className,
        )}
        title={teamName}
        aria-label={`${teamName} flag`}
      >
        {getFallbackCode(teamName)}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "fi shrink-0 rounded-[0.15rem] bg-center bg-contain bg-no-repeat",
        "shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
        `fi-${flagCode}`,
        simpleSizeStyles[size] ?? simpleSizeStyles.md,
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    />
  );
}

function PremiumFlag({ teamName, flagCode, size, className }) {
  const styles = premiumSizeStyles[size] ?? premiumSizeStyles.md;

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/12 bg-[#050b1c]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_45px_rgba(0,0,0,0.52)]",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_38%)]",
        "after:absolute after:inset-x-5 after:bottom-2 after:h-3 after:rounded-full after:bg-emerald-300/10 after:blur-md",
        styles.wrapper,
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      <span className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),transparent_40%,rgba(0,0,0,0.38))]" />

      {flagCode ? (
        <span
          className={clsx(
            "fi relative z-10 rounded-lg bg-center bg-contain bg-no-repeat",
            "shadow-[0_8px_24px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
            `fi-${flagCode}`,
            styles.flag,
          )}
        />
      ) : (
        <span className="relative z-10 text-sm font-black uppercase tracking-widest text-slate-200">
          {getFallbackCode(teamName)}
        </span>
      )}
    </span>
  );
}

function getFlagCode(teamName) {
  const normalized = normalizeTeamName(teamName);
  return normalizedTeamFlagCodes[normalized] ?? "";
}

function normalizeTeamName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.+/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
}

function getFallbackCode(teamName) {
  return String(teamName ?? "TBD")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}