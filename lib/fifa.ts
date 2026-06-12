const API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const WORLD_CUP_2026_SEASON_ID = "285023";

type Team = {
  Score: number | null;
  ShortClubName?: string;
  Abbreviation?: string;
  IdTeam?: string;
};

type Match = {
  IdMatch: string;
  Date: string;
  MatchStatus: number;
  StageName?: Array<{ Description: string }>;
  Stadium?: { Name?: Array<{ Description: string }> };
  Home?: Team;
  Away?: Team;
  Winner?: string | null;
};

type MatchResponse = {
  Results?: Match[];
};

type StandingRow = {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
};

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
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FIFA data: ${response.status}`);
  }

  const payload = (await response.json()) as MatchResponse;
  const matches = payload.Results ?? [];

  const stats = new Map<string, Omit<StandingRow, "gd">>();

  const ensure = (name: string) => {
    if (!stats.has(name)) {
      stats.set(name, {
        team: name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
      });
    }
    return stats.get(name)!;
  };

  for (const match of matches) {
    const home = displayTeamName(match.Home);
    const away = displayTeamName(match.Away);

    if (home !== "TBD") ensure(home);
    if (away !== "TBD") ensure(away);
  }

  for (const match of matches) {
    const homeScore = match.Home?.Score;
    const awayScore = match.Away?.Score;

    if (homeScore == null || awayScore == null) continue;

    const home = displayTeamName(match.Home);
    const away = displayTeamName(match.Away);
    const homeStats = ensure(home);
    const awayStats = ensure(away);

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

  return {
    seasonId: WORLD_CUP_2026_SEASON_ID,
    seasonName: "FIFA World Cup 2026™",
    generatedAt: new Date().toISOString(),
    standings,
    matches: matches.map((match) => ({
      id: match.IdMatch,
      date: match.Date,
      stage: match.StageName?.[0]?.Description ?? "Match",
      stadium: match.Stadium?.Name?.[0]?.Description ?? "TBD",
      homeTeam: displayTeamName(match.Home),
      awayTeam: displayTeamName(match.Away),
      homeScore: match.Home?.Score ?? "-",
      awayScore: match.Away?.Score ?? "-",
      statusLabel: statusLabel(match),
    })),
  };
}
