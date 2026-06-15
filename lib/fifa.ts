import picks from "@/data/picks.json";
import { getCountryLabel } from "@/lib/countries";

const API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const WORLD_CUP_2026_SEASON_ID = "285023";
export const FIFA_MATCHES_TAG = "fifa-matches";

const STAGE_POINTS = {
  none: 0,
  groupBreakthrough: 2,
  best16: 3,
  best8: 4,
  best4: 5,
  runnerUp: 7,
  champion: 10,
} as const;

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
  StageName?: Array<{ Description: string }>;
  GroupName?: Array<{ Description: string }>;
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
  progressLabel: string;
  progressPoints: number;
  winPoints: number;
  wins: number;
  points: number;
};

type ParticipantScore = {
  name: string;
  totalPoints: number;
  picks: ParticipantPick[];
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
      return "優勝 + 決勝進出";
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
  if (progressKey === "champion") {
    return STAGE_POINTS.champion + STAGE_POINTS.runnerUp;
  }

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

function getParticipantScores(matches: Match[]): ParticipantScore[] {
  const tournamentProgress = getTournamentProgress(matches);
  const winCounts = getWinCounts(matches);

  return picks
    .map((entry) => {
      const participantPicks = entry.countries.map((countryCode) => {
        const progressKey = getProgressKey(countryCode, tournamentProgress);
        const stagePoints = progressPoints(progressKey);
        const wins = winCounts.get(countryCode) ?? 0;
        const winPoints = wins;

        return {
          country: getCountryLabel(countryCode, "ja"),
          countryCode,
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
        picks: participantPicks,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
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
    participantScores: getParticipantScores(matches),
    standings,
    featuredMatches: getFeaturedMatches(dashboardMatches),
    matches: dashboardMatches,
  };
}
