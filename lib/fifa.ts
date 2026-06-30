import picks from "@/data/picks.json";
import {
  findCountryCodeByEnglishName,
  getCountryFlagEmoji,
  getCountryLabel,
} from "@/lib/countries";

const API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const WORLD_ELO_RATINGS_URL = "https://eloratings.net/World.tsv";
const WORLD_ELO_TEAMS_URL = "https://eloratings.net/en.teams.tsv";
const HISTORICAL_RESULTS_URL =
  "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";
const WORLD_CUP_2026_SEASON_ID = "285023";
export const FIFA_MATCHES_TAG = "fifa-matches";
export const WORLD_ELO_TAG = "world-elo-ratings";
export const HISTORICAL_RESULTS_TAG = "historical-results";
const SIMULATION_ITERATIONS = 1500;
const GROUP_DRAW_PROBABILITY = 0.25;
const HISTORY_LOOKBACK_YEARS = 8;
const HISTORY_MATCH_LIMIT = 10;
const CURRENT_TOURNAMENT_POINT_WEIGHT = 140;
const CURRENT_TOURNAMENT_GD_WEIGHT = 32;
const CURRENT_TOURNAMENT_WIN_WEIGHT = 10;
const CURRENT_TOURNAMENT_BONUS_CAP = 180;
const CHAMPION_PEDIGREE_DRAW_PROBABILITY = 0.22;
const CHAMPION_PEDIGREE_BONUS_CAP = 60;
const PAST_WORLD_CUP_CHAMPIONS = [
  "ARG",
  "BRA",
  "ENG",
  "ESP",
  "FRA",
  "GER",
  "URU",
] as const;

const STAGE_POINTS = {
  none: 0,
  groupBreakthrough: 2,
  best16: 3,
  best8: 4,
  best4: 5,
  runnerUp: 7,
  champion: 10,
} as const;

const COUNTRY_RATINGS: Record<string, number> = {
  ARG: 1940,
  AUS: 1740,
  AUT: 1800,
  BEL: 1880,
  BIH: 1640,
  BRA: 1950,
  CAN: 1760,
  CIV: 1760,
  COD: 1660,
  COL: 1850,
  CPV: 1670,
  CRO: 1840,
  CUW: 1550,
  CZE: 1745,
  ECU: 1780,
  EGY: 1720,
  ENG: 1910,
  ESP: 1920,
  FRA: 1930,
  GER: 1885,
  GHA: 1735,
  HAI: 1500,
  IRN: 1770,
  IRQ: 1580,
  JOR: 1610,
  JPN: 1840,
  KOR: 1790,
  KSA: 1640,
  MAR: 1810,
  MEX: 1810,
  NED: 1890,
  NOR: 1790,
  NZL: 1630,
  PAN: 1620,
  PAR: 1750,
  POR: 1900,
  QAT: 1600,
  RSA: 1650,
  SCO: 1710,
  SEN: 1830,
  SUI: 1795,
  SWE: 1775,
  TUN: 1680,
  TUR: 1780,
  URU: 1860,
  USA: 1820,
  UZB: 1690,
};

type SiteTeamDictionary = Map<string, string>;

type Team = {
  Score: number | null;
  ShortClubName?: string;
  Abbreviation?: string;
  IdTeam?: string;
  IdCountry?: string;
};

type Match = {
  IdMatch: string;
  Date: string;
  MatchStatus: number;
  MatchNumber?: number | null;
  StageName?: Array<{ Description: string }>;
  GroupName?: Array<{ Description: string }>;
  PlaceHolderA?: string | null;
  PlaceHolderB?: string | null;
  Stadium?: { Name?: Array<{ Description: string }> };
  Home?: Team;
  Away?: Team;
  Winner?: string | null;
};

type MatchResponse = {
  Results?: Match[];
};

type DashboardMatch = {
  id: string;
  date: string;
  stage: string;
  group: string | null;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string;
  awayScore: number | string;
  statusLabel: string;
};

type StandingRow = {
  key: string;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
};

type ParticipantPick = {
  country: string;
  countryCode: string;
  flag: string;
  progressLabel: string;
  progressPoints: number;
  winPoints: number;
  wins: number;
  points: number;
};

type BracketMatch = {
  id: string;
  number: number | null;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string;
  awayScore: number | string;
  statusLabel: string;
};

type ParticipantScore = {
  name: string;
  totalPoints: number;
  projectedTotalPoints: number;
  projectedWinRate: number;
  projectedLastPlaceRate: number;
  projectedReasons: string[];
  picks: ParticipantPick[];
};

type SimGroupRow = {
  code: string;
  group: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
  rating: number;
};

type SimKnockoutResult = {
  winner: string;
  loser: string;
};

type SimulationAggregate = {
  averagePoints: Record<string, number>;
  winShares: Record<string, number>;
  lastPlaceShares: Record<string, number>;
};

type StrengthProfile = {
  ratings: Record<string, number>;
  source: string;
};

type HistoricalMatchSample = {
  date: number;
  points: number;
  goalDiff: number;
  weight: number;
};

type CurrentTournamentSample = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDiff: number;
};

type ProgressKey =
  | "none"
  | "groupBreakthrough"
  | "best16"
  | "best8"
  | "best4"
  | "runnerUp"
  | "champion";

type TournamentProgress = {
  groupBreakthrough: Set<string>;
  best16: Set<string>;
  best8: Set<string>;
  best4: Set<string>;
  champion: string | null;
  runnerUp: string | null;
};

type RankedParticipantScore = Omit<ParticipantScore, "projectedReasons">;

function getCountryOwners() {
  const owners = new Map<string, string[]>();

  for (const entry of picks) {
    for (const countryCode of entry.countries) {
      const currentOwners = owners.get(countryCode) ?? [];
      currentOwners.push(entry.name);
      owners.set(countryCode, currentOwners);
    }
  }

  return owners;
}

function teamName(team?: Team) {
  return team?.ShortClubName ?? team?.Abbreviation ?? "Unknown";
}

function displayTeamName(team?: Team) {
  const name = teamName(team);
  return name === "Unknown" ? "TBD" : name;
}

function statusLabel(match: Match) {
  if (match.Home?.Score != null && match.Away?.Score != null) {
    return "FT";
  }

  if (match.MatchStatus === 1 || match.MatchStatus === 3) {
    return "Scheduled";
  }

  if (match.MatchStatus === 2) {
    return "Live";
  }

  return "Update pending";
}

function stageName(match: Match) {
  return match.StageName?.[0]?.Description ?? "Match";
}

function isFinished(match: Match) {
  return match.Home?.Score != null && match.Away?.Score != null;
}

function addTeam(target: Set<string>, team?: Team) {
  if (team?.IdCountry) {
    target.add(team.IdCountry);
  }
}

function getTeamKey(team?: Team) {
  return team?.IdCountry ?? displayTeamName(team);
}

function formatStandingTeam(team: Team | undefined, owners: Map<string, string[]>) {
  return formatPickedTeam(team, owners);
}

function getTournamentProgress(matches: Match[]): TournamentProgress {
  const progress: TournamentProgress = {
    groupBreakthrough: new Set<string>(),
    best16: new Set<string>(),
    best8: new Set<string>(),
    best4: new Set<string>(),
    champion: null,
    runnerUp: null,
  };

  for (const match of matches) {
    const stage = stageName(match);

    if (stage === "Round of 32") {
      addTeam(progress.groupBreakthrough, match.Home);
      addTeam(progress.groupBreakthrough, match.Away);
    }

    if (stage === "Round of 16") {
      addTeam(progress.best16, match.Home);
      addTeam(progress.best16, match.Away);
    }

    if (stage === "Quarter-final") {
      addTeam(progress.best8, match.Home);
      addTeam(progress.best8, match.Away);
    }

    if (stage === "Semi-final") {
      addTeam(progress.best4, match.Home);
      addTeam(progress.best4, match.Away);
    }

    if (
      stage === "Final" &&
      isFinished(match) &&
      match.Home?.IdCountry &&
      match.Away?.IdCountry
    ) {
      const homeCode = match.Home.IdCountry;
      const awayCode = match.Away.IdCountry;

      if (match.Winner && match.Winner === match.Home?.IdTeam) {
        progress.champion = homeCode;
        progress.runnerUp = awayCode;
      } else if (match.Winner && match.Winner === match.Away?.IdTeam) {
        progress.champion = awayCode;
        progress.runnerUp = homeCode;
      } else if ((match.Home.Score ?? 0) > (match.Away.Score ?? 0)) {
        progress.champion = homeCode;
        progress.runnerUp = awayCode;
      } else if ((match.Away.Score ?? 0) > (match.Home.Score ?? 0)) {
        progress.champion = awayCode;
        progress.runnerUp = homeCode;
      }
    }
  }

  return progress;
}

function getProgressKey(
  countryCode: string | null,
  tournamentProgress: TournamentProgress,
): ProgressKey {
  if (!countryCode) return "none";
  if (tournamentProgress.champion === countryCode) return "champion";
  if (tournamentProgress.runnerUp === countryCode) return "runnerUp";
  if (tournamentProgress.best4.has(countryCode)) return "best4";
  if (tournamentProgress.best8.has(countryCode)) return "best8";
  if (tournamentProgress.best16.has(countryCode)) return "best16";
  if (tournamentProgress.groupBreakthrough.has(countryCode)) {
    return "groupBreakthrough";
  }
  return "none";
}

function progressLabel(progressKey: ProgressKey) {
  switch (progressKey) {
    case "champion":
      return "優勝";
    case "runnerUp":
      return "決勝進出";
    case "best4":
      return "ベスト4";
    case "best8":
      return "ベスト8";
    case "best16":
      return "ベスト16";
    case "groupBreakthrough":
      return "グループ突破";
    default:
      return "未獲得";
  }
}

function progressPoints(progressKey: ProgressKey) {
  return STAGE_POINTS[progressKey];
}

function getWinCounts(matches: Match[]) {
  const winCounts = new Map<string, number>();

  const addWin = (countryCode?: string) => {
    if (!countryCode) return;
    winCounts.set(countryCode, (winCounts.get(countryCode) ?? 0) + 1);
  };

  for (const match of matches) {
    const homeScore = match.Home?.Score;
    const awayScore = match.Away?.Score;

    if (homeScore == null || awayScore == null) continue;

    if (match.Winner && match.Winner === match.Home?.IdTeam) {
      addWin(match.Home?.IdCountry);
    } else if (match.Winner && match.Winner === match.Away?.IdTeam) {
      addWin(match.Away?.IdCountry);
    } else if (homeScore > awayScore) {
      addWin(match.Home?.IdCountry);
    } else if (awayScore > homeScore) {
      addWin(match.Away?.IdCountry);
    }
  }

  return winCounts;
}

function formatPickedTeam(team: Team | undefined, owners: Map<string, string[]>) {
  if (!team?.IdCountry) {
    return displayTeamName(team);
  }

  const baseLabel = getCountryLabel(team.IdCountry, "ja");
  const pickedBy = owners.get(team.IdCountry);

  if (!pickedBy || pickedBy.length === 0) {
    return baseLabel;
  }

  return `${baseLabel}(${pickedBy.join("・")})`;
}

function placeholderLabel(token?: string | null) {
  if (!token) return "TBD";

  if (/^[12][A-Z]$/.test(token)) {
    return `${token[1]}組${token[0]}位`;
  }

  if (/^3[A-Z]+$/.test(token)) {
    return "3位通過";
  }

  if (/^W\d+$/.test(token)) {
    return `${token.slice(1)}勝者`;
  }

  if (/^RU\d+$/.test(token)) {
    return `${token.slice(2)}敗者`;
  }

  return token;
}

function formatBracketTeam(team: Team | undefined, placeholder?: string | null) {
  if (team?.IdCountry) {
    return getCountryLabel(team.IdCountry, "ja");
  }

  return placeholderLabel(placeholder);
}

function toDashboardMatch(match: Match, owners: Map<string, string[]>): DashboardMatch {
  return {
    id: match.IdMatch,
    date: match.Date,
    stage: stageName(match),
    group: match.GroupName?.[0]?.Description ?? null,
    stadium: match.Stadium?.Name?.[0]?.Description ?? "TBD",
    homeTeam: formatPickedTeam(match.Home, owners),
    awayTeam: formatPickedTeam(match.Away, owners),
    homeScore: match.Home?.Score ?? "-",
    awayScore: match.Away?.Score ?? "-",
    statusLabel: statusLabel(match),
  };
}

function toBracketMatch(match: Match): BracketMatch {
  return {
    id: match.IdMatch,
    number: match.MatchNumber ?? null,
    stage: stageName(match),
    homeTeam: formatBracketTeam(match.Home, match.PlaceHolderA),
    awayTeam: formatBracketTeam(match.Away, match.PlaceHolderB),
    homeScore: match.Home?.Score ?? "-",
    awayScore: match.Away?.Score ?? "-",
    statusLabel: statusLabel(match),
  };
}

function getFeaturedMatches(matches: DashboardMatch[]) {
  const now = Date.now();
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const previous = sortedMatches.filter((match) => new Date(match.date).getTime() < now);
  const upcoming = sortedMatches.filter((match) => new Date(match.date).getTime() >= now);

  return [...previous.slice(-2), ...upcoming.slice(0, 2)].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function getRating(countryCode: string, ratings: Record<string, number>) {
  return ratings[countryCode] ?? COUNTRY_RATINGS[countryCode] ?? 1700;
}

function parseEloTeamsTable(payload: string) {
  const siteTeams: SiteTeamDictionary = new Map();

  for (const line of payload.split("\n")) {
    const [siteCode, englishName] = line.trim().split("\t");

    if (!siteCode || !englishName) continue;
    siteTeams.set(siteCode, englishName);
  }

  return siteTeams;
}

function parseWorldEloRatings(payload: string, siteTeams: SiteTeamDictionary) {
  const ratings: Record<string, number> = { ...COUNTRY_RATINGS };

  for (const line of payload.split("\n")) {
    const fields = line.trim().split("\t");
    const siteCode = fields[2];
    const ratingValue = Number(fields[3]);

    if (!siteCode || Number.isNaN(ratingValue)) continue;

    const englishName = siteTeams.get(siteCode);
    if (!englishName) continue;

    const countryCode = findCountryCodeByEnglishName(englishName);
    if (!countryCode) continue;

    ratings[countryCode] = ratingValue;
  }

  return ratings;
}

async function getCountryRatings() {
  try {
    const [ratingsResponse, teamsResponse] = await Promise.all([
      fetch(WORLD_ELO_RATINGS_URL, {
        headers: {
          Accept: "text/tab-separated-values,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 21600, tags: [WORLD_ELO_TAG] },
      }),
      fetch(WORLD_ELO_TEAMS_URL, {
        headers: {
          Accept: "text/tab-separated-values,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 21600, tags: [WORLD_ELO_TAG] },
      }),
    ]);

    if (!ratingsResponse.ok || !teamsResponse.ok) {
      throw new Error(
        `Failed to fetch World Elo ratings: ${ratingsResponse.status}/${teamsResponse.status}`,
      );
    }

    const [ratingsPayload, teamsPayload] = await Promise.all([
      ratingsResponse.text(),
      teamsResponse.text(),
    ]);

    return parseWorldEloRatings(
      ratingsPayload,
      parseEloTeamsTable(teamsPayload),
    );
  } catch (error) {
    console.error("Falling back to local ratings after Elo fetch failure.", error);
    return { ...COUNTRY_RATINGS };
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function getTournamentWeight(tournament: string) {
  if (tournament === "FIFA World Cup") return 1.4;
  if (tournament.includes("Confederations Cup")) return 1.25;
  if (tournament.includes("Nations League")) return 1.15;
  if (tournament.includes("Qualifier")) return 1.15;
  if (tournament.includes("Cup")) return 1.1;
  if (tournament.includes("Championship")) return 1.1;
  if (tournament === "Friendly") return 0.85;
  return 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function applyHistoricalFormAdjustments(
  baseRatings: Record<string, number>,
  historicalResults: string,
) {
  const ratings = { ...baseRatings };
  const trackedCodes = new Set(Object.keys(baseRatings));
  const samples = new Map<string, HistoricalMatchSample[]>();
  const cutoff = new Date().getFullYear() - HISTORY_LOOKBACK_YEARS;

  for (const line of historicalResults.split("\n").slice(1)) {
    if (!line.trim()) continue;

    const [
      dateText,
      homeTeam,
      awayTeam,
      homeScoreText,
      awayScoreText,
      tournament,
    ] = parseCsvLine(line);

    if (!dateText || !homeTeam || !awayTeam) continue;

    const matchYear = Number(dateText.slice(0, 4));
    if (Number.isNaN(matchYear) || matchYear < cutoff) continue;

    const homeCode = findCountryCodeByEnglishName(homeTeam);
    const awayCode = findCountryCodeByEnglishName(awayTeam);

    if (!homeCode || !awayCode) continue;
    if (!trackedCodes.has(homeCode) && !trackedCodes.has(awayCode)) continue;

    const homeScore = Number(homeScoreText);
    const awayScore = Number(awayScoreText);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

    const date = new Date(dateText).getTime();
    const weight = getTournamentWeight(tournament);

    const pushSample = (
      code: string,
      points: number,
      goalDiff: number,
    ) => {
      const current = samples.get(code) ?? [];
      current.push({ date, points, goalDiff, weight });
      samples.set(code, current);
    };

    if (homeScore > awayScore) {
      pushSample(homeCode, 3, homeScore - awayScore);
      pushSample(awayCode, 0, awayScore - homeScore);
    } else if (awayScore > homeScore) {
      pushSample(homeCode, 0, homeScore - awayScore);
      pushSample(awayCode, 3, awayScore - homeScore);
    } else {
      pushSample(homeCode, 1, 0);
      pushSample(awayCode, 1, 0);
    }
  }

  for (const code of trackedCodes) {
    const recentMatches = (samples.get(code) ?? [])
      .sort((a, b) => a.date - b.date)
      .slice(-HISTORY_MATCH_LIMIT);

    if (recentMatches.length === 0) continue;

    let totalWeight = 0;
    let weightedPoints = 0;
    let weightedGoalDiff = 0;

    recentMatches.forEach((match, index) => {
      const recencyWeight =
        0.5 + (0.5 * index) / Math.max(recentMatches.length - 1, 1);
      const combinedWeight = match.weight * recencyWeight;

      totalWeight += combinedWeight;
      weightedPoints += match.points * combinedWeight;
      weightedGoalDiff += match.goalDiff * combinedWeight;
    });

    if (totalWeight === 0) continue;

    const weightedPpg = weightedPoints / totalWeight;
    const weightedGd = weightedGoalDiff / totalWeight;
    const ppgBonus = ((weightedPpg - 1.35) / 1.65) * 90;
    const gdBonus = clamp(weightedGd, -2.5, 2.5) * 18;
    const formBonus = clamp(ppgBonus + gdBonus, -120, 120);

    ratings[code] = Math.round((ratings[code] ?? COUNTRY_RATINGS[code] ?? 1700) + formBonus);
  }

  return ratings;
}

function applyChampionPedigreeAdjustments(
  baseRatings: Record<string, number>,
) {
  const ratings = { ...baseRatings };
  const championPool = PAST_WORLD_CUP_CHAMPIONS.filter((countryCode) =>
    Boolean(baseRatings[countryCode] ?? COUNTRY_RATINGS[countryCode]),
  );

  for (const countryCode of Object.keys(baseRatings)) {
    if (championPool.length === 0) continue;

    let expectedPointsTotal = 0;

    for (const championCode of championPool) {
      const teamRating = getRating(countryCode, baseRatings);
      const championRating = getRating(championCode, baseRatings);
      const winProbability =
        1 / (1 + 10 ** ((championRating - teamRating) / 400));
      const decisiveProbability = 1 - CHAMPION_PEDIGREE_DRAW_PROBABILITY;
      const expectedPoints =
        CHAMPION_PEDIGREE_DRAW_PROBABILITY +
        decisiveProbability * 3 * winProbability;

      expectedPointsTotal += expectedPoints;
    }

    const averageExpectedPoints = expectedPointsTotal / championPool.length;
    const pedigreeBonus = clamp(
      ((averageExpectedPoints - 1.1) / 1.4) * CHAMPION_PEDIGREE_BONUS_CAP,
      -CHAMPION_PEDIGREE_BONUS_CAP,
      CHAMPION_PEDIGREE_BONUS_CAP,
    );

    ratings[countryCode] = Math.round(getRating(countryCode, baseRatings) + pedigreeBonus);
  }

  return ratings;
}

function getStageMomentumBonus(stage: string) {
  switch (stage) {
    case "Round of 16":
      return 20;
    case "Quarter-final":
      return 35;
    case "Semi-final":
      return 55;
    case "Final":
      return 80;
    default:
      return 0;
  }
}

function applyCurrentTournamentAdjustments(
  baseRatings: Record<string, number>,
  matches: Match[],
) {
  const ratings = { ...baseRatings };
  const samples = new Map<string, CurrentTournamentSample>();

  const ensure = (countryCode: string) => {
    if (!samples.has(countryCode)) {
      samples.set(countryCode, {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        goalDiff: 0,
      });
    }

    return samples.get(countryCode)!;
  };

  for (const match of matches) {
    const homeCode = match.Home?.IdCountry;
    const awayCode = match.Away?.IdCountry;

    if (!homeCode || !awayCode) continue;

    if (!samples.has(homeCode)) ensure(homeCode);
    if (!samples.has(awayCode)) ensure(awayCode);

    const stageBonus = getStageMomentumBonus(stageName(match));
    if (stageBonus > 0) {
      ratings[homeCode] = (ratings[homeCode] ?? COUNTRY_RATINGS[homeCode] ?? 1700) + stageBonus;
      ratings[awayCode] = (ratings[awayCode] ?? COUNTRY_RATINGS[awayCode] ?? 1700) + stageBonus;
    }

    if (!isFinished(match)) continue;

    const home = ensure(homeCode);
    const away = ensure(awayCode);
    const homeScore = match.Home?.Score ?? 0;
    const awayScore = match.Away?.Score ?? 0;

    home.played += 1;
    away.played += 1;
    home.goalDiff += homeScore - awayScore;
    away.goalDiff += awayScore - homeScore;

    const winner = getOutcomeWinner(match);

    if (winner === homeCode) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (winner === awayCode) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const [countryCode, sample] of samples) {
    if (sample.played === 0) continue;

    const pointsPerMatch = sample.points / sample.played;
    const goalDiffPerMatch = sample.goalDiff / sample.played;
    const winRate = sample.wins / sample.played;
    const pointBonus = ((pointsPerMatch - 1.15) / 1.85) * CURRENT_TOURNAMENT_POINT_WEIGHT;
    const goalDiffBonus =
      clamp(goalDiffPerMatch, -2.5, 2.5) * CURRENT_TOURNAMENT_GD_WEIGHT;
    const winBonus = winRate * CURRENT_TOURNAMENT_WIN_WEIGHT;
    const tournamentBonus = clamp(
      pointBonus + goalDiffBonus + winBonus,
      -CURRENT_TOURNAMENT_BONUS_CAP,
      CURRENT_TOURNAMENT_BONUS_CAP,
    );

    ratings[countryCode] = Math.round(
      (ratings[countryCode] ?? COUNTRY_RATINGS[countryCode] ?? 1700) + tournamentBonus,
    );
  }

  return ratings;
}

function getPotentialScoringCountries(
  matches: Match[],
  ratings: Record<string, number>,
) {
  const activeCountries = new Set<string>();
  const groups = createGroupState(matches, ratings);
  const unfinishedGroupNames = new Set<string>();

  for (const match of matches) {
    if (stageName(match) !== "First Stage" || isFinished(match)) continue;
    const group = match.GroupName?.[0]?.Description?.replace("Group ", "");
    if (!group) continue;
    unfinishedGroupNames.add(group);
    if (match.Home?.IdCountry) activeCountries.add(match.Home.IdCountry);
    if (match.Away?.IdCountry) activeCountries.add(match.Away.IdCountry);
  }

  const groupCandidates = new Map<
    string,
    { first: Set<string>; second: Set<string>; third: Set<string> }
  >();

  for (const [group, rows] of groups) {
    const ranked = rankGroup(rows);

    if (unfinishedGroupNames.has(group)) {
      const allTeams = new Set(rows.map((row) => row.code));
      allTeams.forEach((countryCode) => activeCountries.add(countryCode));
      groupCandidates.set(group, {
        first: new Set(allTeams),
        second: new Set(allTeams),
        third: new Set(allTeams),
      });
      continue;
    }

    groupCandidates.set(group, {
      first: new Set([ranked[0].code]),
      second: new Set([ranked[1].code]),
      third: new Set([ranked[2].code]),
    });
  }

  const knockoutMatches = matches
    .filter((match) => stageName(match) !== "First Stage")
    .sort((a, b) => (a.MatchNumber ?? 0) - (b.MatchNumber ?? 0));
  const winnerCandidates = new Map<number, Set<string>>();
  const loserCandidates = new Map<number, Set<string>>();

  const resolveToken = (token?: string | null) => {
    if (!token) return new Set<string>();

    if (token.startsWith("1") || token.startsWith("2")) {
      const place = token[0];
      const group = token.slice(1);
      const candidates = groupCandidates.get(group);
      if (!candidates) return new Set<string>();
      return place === "1" ? candidates.first : candidates.second;
    }

    if (token.startsWith("3")) {
      const candidateSet = new Set<string>();
      for (const group of token.replace(/^3/, "").split("")) {
        const candidates = groupCandidates.get(group)?.third;
        candidates?.forEach((countryCode) => candidateSet.add(countryCode));
      }
      return candidateSet;
    }

    if (token.startsWith("W")) {
      return winnerCandidates.get(Number(token.slice(1))) ?? new Set<string>();
    }

    if (token.startsWith("RU")) {
      return loserCandidates.get(Number(token.slice(2))) ?? new Set<string>();
    }

    return new Set<string>();
  };

  for (const match of knockoutMatches) {
    const matchNumber = match.MatchNumber ?? 0;
    const homeCandidates = match.Home?.IdCountry
      ? new Set([match.Home.IdCountry])
      : resolveToken(match.PlaceHolderA);
    const awayCandidates = match.Away?.IdCountry
      ? new Set([match.Away.IdCountry])
      : resolveToken(match.PlaceHolderB);
    const participants = new Set<string>([
      ...homeCandidates,
      ...awayCandidates,
    ]);

    if (!isFinished(match)) {
      participants.forEach((countryCode) => activeCountries.add(countryCode));
    }

    if (isFinished(match)) {
      const winner = getOutcomeWinner(match);
      if (winner) {
        const loser =
          winner === match.Home?.IdCountry ? match.Away?.IdCountry : match.Home?.IdCountry;

        winnerCandidates.set(matchNumber, new Set([winner]));
        if (loser) {
          loserCandidates.set(matchNumber, new Set([loser]));
        }
      }
      continue;
    }

    winnerCandidates.set(matchNumber, new Set(participants));
    loserCandidates.set(matchNumber, new Set(participants));
  }

  return activeCountries;
}

async function getStrengthProfile(): Promise<StrengthProfile> {
  const baseRatings = await getCountryRatings();
  return {
    ratings: baseRatings,
    source: "World Football Elo Ratings",
  };
}

async function getStrengthProfileFromMatches(
  matches: Match[],
): Promise<StrengthProfile> {
  const baseProfile = await getStrengthProfile();
  const activeCountries = getPotentialScoringCountries(matches, baseProfile.ratings);

  try {
    const response = await fetch(HISTORICAL_RESULTS_URL, {
      headers: {
        Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 86400, tags: [HISTORICAL_RESULTS_TAG] },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch historical results: ${response.status}`);
    }

    const historicalResults = await response.text();
    const pedigreeAdjustedRatings = applyChampionPedigreeAdjustments(
      baseProfile.ratings,
    );
    const historyAdjustedRatings = applyHistoricalFormAdjustments(
      pedigreeAdjustedRatings,
      historicalResults,
    );
    const tournamentAdjustedRatings = applyCurrentTournamentAdjustments(
      historyAdjustedRatings,
      matches,
    );
    const activeAdjustedRatings = { ...tournamentAdjustedRatings };

    for (const countryCode of Object.keys(activeAdjustedRatings)) {
      if (!activeCountries.has(countryCode)) {
        activeAdjustedRatings[countryCode] = getRating(
          countryCode,
          baseProfile.ratings,
        );
      }
    }

    return {
      ratings: activeAdjustedRatings,
      source:
        "Current World Cup state + World Football Elo Ratings + International Results + champion prior",
    };
  } catch (error) {
    console.error(
      "Falling back to Elo-only profile after historical results fetch failure.",
      error,
    );

    const tournamentAdjustedRatings = applyCurrentTournamentAdjustments(
      applyChampionPedigreeAdjustments(baseProfile.ratings),
      matches,
    );
    const activeAdjustedRatings = { ...tournamentAdjustedRatings };

    for (const countryCode of Object.keys(activeAdjustedRatings)) {
      if (!activeCountries.has(countryCode)) {
        activeAdjustedRatings[countryCode] = getRating(
          countryCode,
          baseProfile.ratings,
        );
      }
    }

    return {
      ratings: activeAdjustedRatings,
      source: "Current World Cup state + World Football Elo Ratings + champion prior",
    };
  }
}

function getProgressRank(progressKey: ProgressKey) {
  switch (progressKey) {
    case "groupBreakthrough":
      return 1;
    case "best16":
      return 2;
    case "best8":
      return 3;
    case "best4":
      return 4;
    case "runnerUp":
      return 5;
    case "champion":
      return 6;
    default:
      return 0;
  }
}

function bumpProgress(
  progress: Map<string, ProgressKey>,
  countryCode: string,
  nextProgress: ProgressKey,
) {
  const current = progress.get(countryCode) ?? "none";

  if (getProgressRank(nextProgress) > getProgressRank(current)) {
    progress.set(countryCode, nextProgress);
  }
}

function getOutcomeWinner(match: Match) {
  const homeCode = match.Home?.IdCountry;
  const awayCode = match.Away?.IdCountry;
  const homeScore = match.Home?.Score;
  const awayScore = match.Away?.Score;

  if (!homeCode || !awayCode || homeScore == null || awayScore == null) {
    return null;
  }

  if (match.Winner === match.Home?.IdTeam) {
    return homeCode;
  }

  if (match.Winner === match.Away?.IdTeam) {
    return awayCode;
  }

  if (homeScore > awayScore) return homeCode;
  if (awayScore > homeScore) return awayCode;
  return null;
}

function buildInitialGroupRows(
  matches: Match[],
  ratings: Record<string, number>,
) {
  const rows = new Map<string, SimGroupRow>();

  const ensure = (group: string, code: string) => {
    const key = `${group}:${code}`;
    if (!rows.has(key)) {
      rows.set(key, {
        code,
        group,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        points: 0,
        rating: getRating(code, ratings),
      });
    }

    return rows.get(key)!;
  };

  for (const match of matches) {
    if (stageName(match) !== "First Stage") continue;

    const group = match.GroupName?.[0]?.Description?.replace("Group ", "");
    const homeCode = match.Home?.IdCountry;
    const awayCode = match.Away?.IdCountry;

    if (!group || !homeCode || !awayCode) continue;

    ensure(group, homeCode);
    ensure(group, awayCode);
  }

  for (const match of matches) {
    if (stageName(match) !== "First Stage" || !isFinished(match)) continue;

    const group = match.GroupName?.[0]?.Description?.replace("Group ", "");
    const homeCode = match.Home?.IdCountry;
    const awayCode = match.Away?.IdCountry;
    const homeScore = match.Home?.Score;
    const awayScore = match.Away?.Score;

    if (
      !group ||
      !homeCode ||
      !awayCode ||
      homeScore == null ||
      awayScore == null
    ) {
      continue;
    }

    const home = ensure(group, homeCode);
    const away = ensure(group, awayCode);

    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    const winner = getOutcomeWinner(match);

    if (winner === homeCode) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (winner === awayCode) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return rows;
}

function createGroupState(
  matches: Match[],
  ratings: Record<string, number>,
) {
  const rows = buildInitialGroupRows(matches, ratings);
  const groups = new Map<string, SimGroupRow[]>();

  for (const row of rows.values()) {
    const current = groups.get(row.group) ?? [];
    current.push({ ...row });
    groups.set(row.group, current);
  }

  return groups;
}

function createBaseWinCounts(matches: Match[]) {
  return new Map(getWinCounts(matches));
}

function simulateGroupMatch(
  home: SimGroupRow,
  away: SimGroupRow,
  winCounts: Map<string, number>,
) {
  const homeWinProbability =
    1 / (1 + 10 ** ((away.rating - home.rating) / 400));
  const roll = Math.random();

  home.played += 1;
  away.played += 1;

  if (roll < GROUP_DRAW_PROBABILITY) {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
    home.gf += 1;
    home.ga += 1;
    away.gf += 1;
    away.ga += 1;
    return;
  }

  const decisiveRoll = (roll - GROUP_DRAW_PROBABILITY) / (1 - GROUP_DRAW_PROBABILITY);
  const homeWins = decisiveRoll < homeWinProbability;

  if (homeWins) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
    home.gf += 2;
    away.ga += 2;
    winCounts.set(home.code, (winCounts.get(home.code) ?? 0) + 1);
    return;
  }

  away.wins += 1;
  home.losses += 1;
  away.points += 3;
  away.gf += 2;
  home.ga += 2;
  winCounts.set(away.code, (winCounts.get(away.code) ?? 0) + 1);
}

function rankGroup(rows: SimGroupRow[]) {
  return [...rows].sort((a, b) => {
    // TODO: Align this with FIFA's full tiebreak order, including fair play.
    return (
      b.points - a.points ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf ||
      b.rating - a.rating ||
      a.code.localeCompare(b.code)
    );
  });
}

function resolveThirdPlaceAssignments(
  qualifiedThirds: Array<{ group: string; code: string }>,
  thirdPlaceTokens: string[],
) {
  const thirdByGroup = new Map(
    qualifiedThirds.map((entry) => [entry.group, entry.code]),
  );
  const tokenCandidates = new Map(
    thirdPlaceTokens.map((token) => [
      token,
      token
        .replace(/^3/, "")
        .split("")
        .filter((group) => thirdByGroup.has(group)),
    ]),
  );

  const assigned = new Map<string, string>();

  const search = (
    remainingTokens: string[],
    usedGroups: Set<string>,
  ): boolean => {
    if (remainingTokens.length === 0) return true;

    const [token, ...rest] = [...remainingTokens].sort((a, b) => {
      return (tokenCandidates.get(a)?.length ?? 0) - (tokenCandidates.get(b)?.length ?? 0);
    });

    const candidates = (tokenCandidates.get(token) ?? []).filter(
      (group) => !usedGroups.has(group),
    );

    for (const group of candidates) {
      assigned.set(token, thirdByGroup.get(group)!);
      usedGroups.add(group);

      if (search(rest.filter((entry) => entry !== token), usedGroups)) {
        return true;
      }

      usedGroups.delete(group);
      assigned.delete(token);
    }

    return false;
  };

  search(thirdPlaceTokens, new Set<string>());

  for (const token of thirdPlaceTokens) {
    if (assigned.has(token)) continue;

    const fallbackGroup = (tokenCandidates.get(token) ?? []).find((group) => {
      return ![...assigned.values()].includes(thirdByGroup.get(group)!);
    });

    if (fallbackGroup) {
      assigned.set(token, thirdByGroup.get(fallbackGroup)!);
    }
  }

  return assigned;
}

function simulateKnockoutMatch(
  homeCode: string,
  awayCode: string,
  ratings: Record<string, number>,
) {
  const homeWinProbability =
    1 /
    (1 + 10 ** ((getRating(awayCode, ratings) - getRating(homeCode, ratings)) / 400));
  return Math.random() < homeWinProbability
    ? { winner: homeCode, loser: awayCode }
    : { winner: awayCode, loser: homeCode };
}

function buildSimulationAggregate(
  matches: Match[],
  ratings: Record<string, number>,
): SimulationAggregate {
  const participants = picks.map((entry) => entry.name);
  const averagePoints = Object.fromEntries(participants.map((name) => [name, 0]));
  const winShares = Object.fromEntries(participants.map((name) => [name, 0]));
  const lastPlaceShares = Object.fromEntries(
    participants.map((name) => [name, 0]),
  );
  const groupMatches = matches.filter((match) => stageName(match) === "First Stage");
  const knockoutMatches = matches
    .filter((match) => stageName(match) !== "First Stage")
    .sort((a, b) => (a.MatchNumber ?? 0) - (b.MatchNumber ?? 0));
  const thirdPlaceTokens = knockoutMatches
    .flatMap((match) => [match.PlaceHolderA, match.PlaceHolderB])
    .filter((token): token is string => Boolean(token?.startsWith("3")));

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration += 1) {
    const groups = createGroupState(matches, ratings);
    const winCounts = createBaseWinCounts(matches);
    const progress = new Map<string, ProgressKey>();

    for (const match of groupMatches) {
      if (isFinished(match)) continue;

      const group = match.GroupName?.[0]?.Description?.replace("Group ", "");
      const homeCode = match.Home?.IdCountry;
      const awayCode = match.Away?.IdCountry;

      if (!group || !homeCode || !awayCode) continue;

      const rows = groups.get(group);
      const home = rows?.find((entry) => entry.code === homeCode);
      const away = rows?.find((entry) => entry.code === awayCode);

      if (!home || !away) continue;

      simulateGroupMatch(home, away, winCounts);
    }

    const positions = new Map<string, { first: string; second: string; third: string }>();
    const qualifiedThirds: Array<{ group: string; code: string; row: SimGroupRow }> = [];

    for (const [group, rows] of groups) {
      const ranked = rankGroup(rows);
      positions.set(group, {
        first: ranked[0].code,
        second: ranked[1].code,
        third: ranked[2].code,
      });
      qualifiedThirds.push({ group, code: ranked[2].code, row: ranked[2] });
    }

    const advancingThirds = qualifiedThirds
      .sort((a, b) => {
        // TODO: Align this with FIFA's official best-third-placed ranking tiebreaks.
        return (
          b.row.points - a.row.points ||
          (b.row.gf - b.row.ga) - (a.row.gf - a.row.ga) ||
          b.row.gf - a.row.gf ||
          b.row.rating - a.row.rating ||
          a.group.localeCompare(b.group)
        );
      })
      .slice(0, 8);

    const thirdAssignments = resolveThirdPlaceAssignments(
      advancingThirds.map(({ group, code }) => ({ group, code })),
      thirdPlaceTokens,
    );
    const knockoutResults = new Map<number, SimKnockoutResult>();

    for (const match of knockoutMatches) {
      const matchNumber = match.MatchNumber ?? 0;
      const stage = stageName(match);
      const resolveToken = (token?: string | null) => {
        if (!token) return null;

        if (token.startsWith("1") || token.startsWith("2")) {
          const place = token[0];
          const group = token.slice(1);
          const groupPosition = positions.get(group);
          if (!groupPosition) return null;
          return place === "1" ? groupPosition.first : groupPosition.second;
        }

        if (token.startsWith("3")) {
          return thirdAssignments.get(token) ?? null;
        }

        if (token.startsWith("W")) {
          return knockoutResults.get(Number(token.slice(1)))?.winner ?? null;
        }

        if (token.startsWith("RU")) {
          return knockoutResults.get(Number(token.slice(2)))?.loser ?? null;
        }

        return null;
      };

      const homeCode =
        match.Home?.IdCountry ?? resolveToken(match.PlaceHolderA);
      const awayCode =
        match.Away?.IdCountry ?? resolveToken(match.PlaceHolderB);

      if (!homeCode || !awayCode) continue;

      if (stage === "Round of 32") {
        bumpProgress(progress, homeCode, "groupBreakthrough");
        bumpProgress(progress, awayCode, "groupBreakthrough");
      } else if (stage === "Round of 16") {
        bumpProgress(progress, homeCode, "best16");
        bumpProgress(progress, awayCode, "best16");
      } else if (stage === "Quarter-final") {
        bumpProgress(progress, homeCode, "best8");
        bumpProgress(progress, awayCode, "best8");
      } else if (stage === "Semi-final") {
        bumpProgress(progress, homeCode, "best4");
        bumpProgress(progress, awayCode, "best4");
      } else if (stage === "Final") {
        bumpProgress(progress, homeCode, "runnerUp");
        bumpProgress(progress, awayCode, "runnerUp");
      }

      let result: SimKnockoutResult;

      if (isFinished(match)) {
        const winner = getOutcomeWinner(match);
        if (!winner) continue;
        result = {
          winner,
          loser: winner === homeCode ? awayCode : homeCode,
        };
      } else {
        result = simulateKnockoutMatch(homeCode, awayCode, ratings);
        winCounts.set(result.winner, (winCounts.get(result.winner) ?? 0) + 1);
      }

      if (stage === "Final") {
        bumpProgress(progress, result.winner, "champion");
        bumpProgress(progress, result.loser, "runnerUp");
      }

      knockoutResults.set(matchNumber, result);
    }

    const simulatedScores = picks
      .map((entry) => {
        const totalPoints = entry.countries.reduce((sum, countryCode) => {
          const key = progress.get(countryCode) ?? "none";
          return sum + progressPoints(key) + (winCounts.get(countryCode) ?? 0);
        }, 0);

        return {
          name: entry.name,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

    const topScore = simulatedScores[0]?.totalPoints ?? 0;
    const topPlayers = simulatedScores.filter((entry) => entry.totalPoints === topScore);
    const bottomScore =
      simulatedScores[simulatedScores.length - 1]?.totalPoints ?? 0;
    const bottomPlayers = simulatedScores.filter(
      (entry) => entry.totalPoints === bottomScore,
    );

    for (const entry of simulatedScores) {
      averagePoints[entry.name] += entry.totalPoints;
    }

    for (const entry of topPlayers) {
      winShares[entry.name] += 1 / topPlayers.length;
    }

    for (const entry of bottomPlayers) {
      lastPlaceShares[entry.name] += 1 / bottomPlayers.length;
    }
  }

  for (const name of participants) {
    averagePoints[name] /= SIMULATION_ITERATIONS;
    winShares[name] /= SIMULATION_ITERATIONS;
    lastPlaceShares[name] /= SIMULATION_ITERATIONS;
  }

  return {
    averagePoints,
    winShares,
    lastPlaceShares,
  };
}

function buildProjectedReasons(
  participant: RankedParticipantScore,
  activeCountries: Set<string>,
) {
  const activePicks = participant.picks.filter((pick) =>
    activeCountries.has(pick.countryCode),
  );
  const lockedPicks = participant.picks.length - activePicks.length;
  const remainingAveragePoints = participant.projectedTotalPoints - participant.totalPoints;
  const formatPickSummary = (pick: ParticipantPick) => {
    const details = [
      pick.progressLabel === "未獲得" ? null : pick.progressLabel,
      pick.winPoints > 0 ? `${pick.wins}勝` : null,
    ].filter(Boolean);

    return `${pick.country} ${pick.points}pt${
      details.length > 0 ? ` (${details.join(" + ")})` : ""
    }`;
  };
  const futureDrivers = [...activePicks]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .slice(0, 3)
    .map(formatPickSummary);

  const reasons = [
    `現在 ${participant.totalPoints}pt、平均では最終 ${participant.projectedTotalPoints.toFixed(1)}pt まで伸びる見込み。`,
    activePicks.length > 0
      ? `まだ ${activePicks.length} か国に加点余地があり、固定済みは ${lockedPicks} か国。`
      : "残っている加点余地がほぼなく、ここからの上積みは小さめ。",
    remainingAveragePoints >= 0
      ? `ここから平均で ${remainingAveragePoints.toFixed(1)}pt の上積み見込み。`
      : `ここからは平均 ${Math.abs(remainingAveragePoints).toFixed(1)}pt ほど目減り見込み。`,
  ];

  if (futureDrivers.length > 0) {
    reasons.push(`これからの主力候補は ${futureDrivers.join(" / ")}。`);
  }

  return reasons;
}

function getParticipantScores(
  matches: Match[],
  ratings: Record<string, number>,
): ParticipantScore[] {
  const tournamentProgress = getTournamentProgress(matches);
  const winCounts = getWinCounts(matches);
  const simulation = buildSimulationAggregate(matches, ratings);
  const activeCountries = getPotentialScoringCountries(matches, ratings);

  const rankedParticipants: RankedParticipantScore[] = picks
    .map((entry) => {
      const participantPicks = entry.countries.map((countryCode) => {
        const progressKey = getProgressKey(countryCode, tournamentProgress);
        const stagePoints = progressPoints(progressKey);
        const wins = winCounts.get(countryCode) ?? 0;
        const winPoints = wins;

        return {
          country: getCountryLabel(countryCode, "ja"),
          countryCode,
          flag: getCountryFlagEmoji(countryCode),
          progressLabel: progressLabel(progressKey),
          progressPoints: stagePoints,
          winPoints,
          wins,
          points: stagePoints + winPoints,
        };
      });

      const totalPoints = participantPicks.reduce(
        (sum, pick) => sum + pick.points,
        0,
      );

      return {
        name: entry.name,
        totalPoints,
        projectedTotalPoints: simulation.averagePoints[entry.name] ?? totalPoints,
        projectedWinRate: simulation.winShares[entry.name] ?? 0,
        projectedLastPlaceRate: simulation.lastPlaceShares[entry.name] ?? 0,
        picks: participantPicks,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

  return rankedParticipants.map((participant) => ({
    ...participant,
    projectedReasons: buildProjectedReasons(participant, activeCountries),
  }));
}

export async function getWorldCupDashboard() {
  const url = new URL(API_URL);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("idSeason", WORLD_CUP_2026_SEASON_ID);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 900, tags: [FIFA_MATCHES_TAG] },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FIFA data: ${response.status}`);
  }

  const payload = (await response.json()) as MatchResponse;
  const matches = payload.Results ?? [];
  const strengthProfile = await getStrengthProfileFromMatches(matches);
  const countryOwners = getCountryOwners();

  const stats = new Map<string, Omit<StandingRow, "gd">>();

  const ensure = (key: string, label: string) => {
    if (!stats.has(key)) {
      stats.set(key, {
        key,
        team: label,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
      });
    }
    return stats.get(key)!;
  };

  for (const match of matches) {
    const homeKey = getTeamKey(match.Home);
    const awayKey = getTeamKey(match.Away);
    const home = formatStandingTeam(match.Home, countryOwners);
    const away = formatStandingTeam(match.Away, countryOwners);

    if (home !== "TBD") ensure(homeKey, home);
    if (away !== "TBD") ensure(awayKey, away);
  }

  for (const match of matches) {
    const homeScore = match.Home?.Score;
    const awayScore = match.Away?.Score;

    if (homeScore == null || awayScore == null) continue;

    const homeKey = getTeamKey(match.Home);
    const awayKey = getTeamKey(match.Away);
    const home = formatStandingTeam(match.Home, countryOwners);
    const away = formatStandingTeam(match.Away, countryOwners);
    const homeStats = ensure(homeKey, home);
    const awayStats = ensure(awayKey, away);

    homeStats.played += 1;
    awayStats.played += 1;
    homeStats.gf += homeScore;
    homeStats.ga += awayScore;
    awayStats.gf += awayScore;
    awayStats.ga += homeScore;

    if (match.Winner && match.Winner === match.Home?.IdTeam) {
      homeStats.wins += 1;
      awayStats.losses += 1;
    } else if (match.Winner && match.Winner === match.Away?.IdTeam) {
      awayStats.wins += 1;
      homeStats.losses += 1;
    } else if (homeScore > awayScore) {
      homeStats.wins += 1;
      awayStats.losses += 1;
    } else if (awayScore > homeScore) {
      awayStats.wins += 1;
      homeStats.losses += 1;
    } else {
      homeStats.draws += 1;
      awayStats.draws += 1;
    }
  }

  const standings: StandingRow[] = [...stats.values()]
    .map((row) => ({
      ...row,
      gd: row.gf - row.ga,
    }))
    .sort((a, b) => {
      return (
        b.wins - a.wins ||
        b.draws - a.draws ||
        a.losses - b.losses ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.team.localeCompare(b.team)
      );
    });

  const dashboardMatches = matches.map((match) => toDashboardMatch(match, countryOwners));
  const bracketMatches = matches
    .filter((match) => stageName(match) !== "First Stage")
    .sort((a, b) => (a.MatchNumber ?? 0) - (b.MatchNumber ?? 0))
    .map((match) => toBracketMatch(match));

  return {
    seasonId: WORLD_CUP_2026_SEASON_ID,
    seasonName: "FIFA World Cup 2026™",
    generatedAt: new Date().toISOString(),
    scoringRules: [
      { label: "優勝", points: 10 },
      { label: "決勝進出", points: 7 },
      { label: "ベスト4", points: 5 },
      { label: "ベスト8", points: 4 },
      { label: "ベスト16", points: 3 },
      { label: "グループ突破", points: 2 },
      { label: "1勝ごと", points: 1 },
    ],
    ratingSource: strengthProfile.source,
    participantScores: getParticipantScores(matches, strengthProfile.ratings),
    standings,
    featuredMatches: getFeaturedMatches(dashboardMatches),
    bracketMatches,
    matches: dashboardMatches,
  };
}
