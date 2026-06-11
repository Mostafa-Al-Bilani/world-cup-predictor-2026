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
  "Bosnia and Her...": "ba",
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
  sm: "text-[1.15rem]",
  md: "text-[1.55rem]",
  lg: "text-[1.85rem]",
  xl: "text-[2.2rem]",
};

const premiumSizeStyles = {
  sm: {
    wrapper: "h-8 w-10 rounded-xl",
    flag: "text-[1.45rem]",
  },
  md: {
    wrapper: "h-11 w-14 rounded-2xl",
    flag: "text-[1.95rem]",
  },
  lg: {
    wrapper: "h-14 w-[4.5rem] rounded-2xl",
    flag: "text-[2.55rem]",
  },
  xl: {
    wrapper: "h-[4.6rem] w-[6.3rem] rounded-3xl",
    flag: "text-[3.35rem]",
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
          "inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-xs font-black text-slate-300",
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
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-950",
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      <span
        className={clsx(
          "fi rounded-[0.15rem] shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
          `fi-${flagCode}`,
          simpleSizeStyles[size] ?? simpleSizeStyles.md,
        )}
      />
    </span>
  );
}

function PremiumFlag({ teamName, flagCode, size, className }) {
  const styles = premiumSizeStyles[size] ?? premiumSizeStyles.md;

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-slate-950/90",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_38px_rgba(0,0,0,0.42)]",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.18),transparent_44%)]",
        "after:absolute after:inset-x-4 after:bottom-1 after:h-3 after:rounded-full after:bg-emerald-300/10 after:blur-md",
        styles.wrapper,
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      <span className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),transparent_42%,rgba(0,0,0,0.24))]" />

      {flagCode ? (
        <span
          className={clsx(
            "fi relative z-10 rounded-md shadow-[0_4px_18px_rgba(0,0,0,0.45)]",
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