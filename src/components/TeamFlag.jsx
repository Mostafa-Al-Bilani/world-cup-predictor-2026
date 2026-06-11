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
  England: "gb",
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
  Scotland: "gb",
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
  Wales: "gb",
};

const simpleFlagCodes = {
  ...teamFlagCodes,
  England: "gb-eng",
  Scotland: "gb-sct",
  Wales: "gb-wls",
};

const normalizedPremiumFlagCodes = Object.fromEntries(
  Object.entries(teamFlagCodes).map(([team, code]) => [
    normalizeTeamName(team),
    code,
  ]),
);

const normalizedSimpleFlagCodes = Object.fromEntries(
  Object.entries(simpleFlagCodes).map(([team, code]) => [
    normalizeTeamName(team),
    code,
  ]),
);

const simpleSizeStyles = {
  sm: {
    wrapper: "h-6 w-8 rounded-md",
    flag: "h-4 w-6",
  },
  md: {
    wrapper: "h-9 w-12 rounded-lg",
    flag: "h-6 w-9",
  },
  lg: {
    wrapper: "h-11 w-14 rounded-xl",
    flag: "h-7 w-11",
  },
  xl: {
    wrapper: "h-12 w-16 rounded-xl",
    flag: "h-8 w-12",
  },
};

const premiumSizeStyles = {
  sm: "h-10 w-12 rounded-xl",
  md: "h-14 w-16 rounded-2xl",
  lg: "h-16 w-20 rounded-2xl",
  xl: "h-[5.6rem] w-[6.8rem] rounded-3xl",
};

const flagsApiSizeByComponentSize = {
  sm: 64,
  md: 64,
  lg: 64,
  xl: 64,
};

export function TeamFlag({
  teamName,
  size = "md",
  className,
  variant = "simple",
}) {
  if (variant === "premium") {
    const flagCode = getPremiumFlagCode(teamName);

    return (
      <PremiumFlag
        teamName={teamName}
        flagCode={flagCode}
        size={size}
        className={className}
      />
    );
  }

  const flagCode = getSimpleFlagCode(teamName);

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
  const styles = simpleSizeStyles[size] ?? simpleSizeStyles.md;

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-slate-950",
        styles.wrapper,
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      {flagCode ? (
        <span
          className={clsx(
            "fi block bg-center bg-contain bg-no-repeat shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
            `fi-${flagCode}`,
            styles.flag,
          )}
        />
      ) : (
        <span className="text-xs font-black uppercase tracking-widest text-slate-300">
          {getFallbackCode(teamName)}
        </span>
      )}
    </span>
  );
}

function PremiumFlag({ teamName, flagCode, size, className }) {
  const styles = premiumSizeStyles[size] ?? premiumSizeStyles.md;
  const apiSize = flagsApiSizeByComponentSize[size] ?? 64;
  const imageUrl = flagCode
    ? `https://flagsapi.com/${flagCode.toUpperCase()}/shiny/${apiSize}.png`
    : "";

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-slate-950/95",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_42px_rgba(0,0,0,0.5)]",
        premiumSizeStyles[size] ?? premiumSizeStyles.md,
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_45%,rgba(0,0,0,0.35))]" />

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className={clsx(
            "relative z-10 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]",
            size === "xl" ? "h-[4.25rem] w-[5.45rem]" : "h-[70%] w-[82%]",
          )}
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}

      <span
        className={clsx(
          "relative z-10 text-sm font-black uppercase tracking-widest text-slate-200",
          imageUrl && "hidden",
        )}
      >
        {getFallbackCode(teamName)}
      </span>
    </span>
  );
}

function getPremiumFlagCode(teamName) {
  const normalized = normalizeTeamName(teamName);
  return normalizedPremiumFlagCodes[normalized] ?? "";
}

function getSimpleFlagCode(teamName) {
  const normalized = normalizeTeamName(teamName);
  return normalizedSimpleFlagCodes[normalized] ?? "";
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