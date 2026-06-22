import { getWorldCupDashboard } from "@/lib/fifa";
import { MatchList } from "@/app/match-list";
import { UpdateButton } from "@/app/update-button";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(date));
}

export default async function HomePage() {
  const dashboard = await getWorldCupDashboard();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">World Cup Picks</p>
            <h1>5人の予想順位</h1>
            <p className="hero-copy">
              FIFAの試合データから現在順位を集計しつつ、残り試合はモンテカルロで流して推定勝率も出しています。
            </p>
          </div>
          <UpdateButton />
        </div>

        <div className="hero-stats">
          <article>
            <span>参加者</span>
            <strong>{dashboard.participantScores.length}人</strong>
          </article>
          <article>
            <span>総予想数</span>
            <strong>
              {dashboard.participantScores.reduce(
                (sum, participant) => sum + participant.picks.length,
                0,
              )}
            </strong>
          </article>
          <article>
            <span>消化試合</span>
            <strong>
              {
                dashboard.matches.filter(
                  (match) =>
                    typeof match.homeScore === "number" &&
                    typeof match.awayScore === "number",
                ).length
              }
            </strong>
          </article>
          <article>
            <span>最終更新</span>
            <strong>{formatDate(dashboard.generatedAt)}</strong>
          </article>
        </div>

        <div className="ranking-grid">
          {dashboard.participantScores.map((participant, index) => (
            <article className="ranking-card" key={participant.name}>
              <p className="ranking-rank">#{index + 1}</p>
              <h2>{participant.name}</h2>
              <div className="ranking-points">
                <strong>{participant.totalPoints}</strong>
                <span>pt</span>
              </div>
              <p className="ranking-projection">
                <span>推定勝率</span>
                <strong>{(participant.projectedWinRate * 100).toFixed(1)}%</strong>
              </p>
              <p className="ranking-summary">
                {participant.picks
                  .map(
                    (pick) => {
                      const details = [
                        pick.progressLabel === "未獲得" ? null : pick.progressLabel,
                        pick.winPoints > 0 ? `${pick.wins}勝` : null,
                      ].filter(Boolean);

                      return `${pick.country} ${pick.points}pt${
                        details.length > 0 ? ` (${details.join(" + ")})` : ""
                      }`;
                    },
                  )
                  .join(" / ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <MatchList
          kicker="Schedule"
          matches={dashboard.featuredMatches}
          showViewAll
          title="直近4試合"
        />

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Standings</p>
              <h2>各国の勝敗表</h2>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.standings.map((team) => (
                  <tr key={team.key}>
                    <td>{team.team}</td>
                    <td>{team.played}</td>
                    <td>{team.wins}</td>
                    <td>{team.draws}</td>
                    <td>{team.losses}</td>
                    <td>{team.gf}</td>
                    <td>{team.ga}</td>
                    <td>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
