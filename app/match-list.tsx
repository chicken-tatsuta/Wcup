import Link from "next/link";

type MatchItem = {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(date));
}

export function MatchList({
  matches,
  title,
  kicker = "Schedule",
  showViewAll = false,
}: {
  matches: MatchItem[];
  title: string;
  kicker?: string;
  showViewAll?: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        {showViewAll ? (
          <Link className="panel-link" href="/schedule">
            全試合を見る
          </Link>
        ) : null}
      </div>

      <div className="matches">
        {matches.map((match) => (
          <article className="match-card" key={match.id}>
            <div className="match-meta">
              <span>{match.group ?? match.stage}</span>
              <span>{formatDate(match.date)}</span>
            </div>
            <div className="match-scoreline">
              <div className="team-line">
                <span>{match.homeTeam}</span>
                <strong>{match.homeScore}</strong>
              </div>
              <div className="team-line">
                <span>{match.awayTeam}</span>
                <strong>{match.awayScore}</strong>
              </div>
            </div>
            <div className="match-footer">
              <span>{match.stadium}</span>
              <span>
                {match.stage} / {match.statusLabel}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
