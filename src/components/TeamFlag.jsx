import clsx from "clsx";

const teamFlagCodes = {
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  Brazil: "br",
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
  Denmark: "dk",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Greece: "gr",
  Honduras: "hn",
  Iran: "ir",
  Iraq: "iq",
  Italy: "it",
  Japan: "jp",
  Jordan: "jo",
  "Korea Republic": "kr",
  "South Korea": "kr",
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

const sizeStyles = {
  sm: {
    wrapper: "h-7 w-8 rounded-lg",
    flag: "text-[1.25rem]",
  },
  md: {
    wrapper: "h-10 w-12 rounded-xl",
    flag: "text-[1.65rem]",
  },
  lg: {
    wrapper: "h-12 w-14 rounded-2xl",
    flag: "text-[1.95rem]",
  },
  xl: {
    wrapper: "h-16 w-20 rounded-2xl",
    flag: "text-[2.7rem]",
  },
};

export function TeamFlag({ teamName, size = "md", className }) {
  const flagCode = teamFlagCodes[teamName];
  const styles = sizeStyles[size] ?? sizeStyles.md;
  const isPremium = size === "xl";

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-slate-950/85",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.35)]",
        styles.wrapper,
        isPremium &&
          "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.16),transparent_42%)] after:absolute after:inset-x-2 after:bottom-1 after:h-2 after:rounded-full after:bg-emerald-300/10 after:blur-md",
        className,
      )}
      title={teamName}
      aria-label={`${teamName} flag`}
    >
      {flagCode ? (
        <span
          className={clsx(
            "fi relative z-10 rounded-[0.2rem] shadow-[0_2px_10px_rgba(0,0,0,0.35)]",
            `fi-${flagCode}`,
            styles.flag,
          )}
        />
      ) : (
        <span
          className={clsx(
            "relative z-10 text-xs font-black uppercase tracking-widest text-slate-300",
            size === "xl" && "text-sm",
          )}
        >
          {getFallbackCode(teamName)}
        </span>
      )}
    </span>
  );
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