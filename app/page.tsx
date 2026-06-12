import { getWorldCupDashboard } from "@/lib/fifa";

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
        <p className="eyebrow">FIFA 2026 Results Tracker</p>
        <h1>各国の勝敗を、更新しやすいReactフロントで一覧化</h1>
        <p className="hero-copy">
          FIFAの公開APIから大会データを取得し、Vercelにそのまま載せられる
          Next.jsアプリとして表示しています。
        </p>

        <div className="hero-stats">
          <article>
            <span>大会</span>
            <strong>{dashboard.seasonName}</strong>
          </article>
          <article>
            <span>取得試合数</span>
            <strong>{dashboard.matches.length}</strong>
          </article>
          <article>
            <span>参加国数</span>
            <strong>{dashboard.standings.length}</strong>
          </article>
          <article>
            <span>最終更新</span>
            <strong>{formatDate(dashboard.generatedAt)}</strong>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Standings</p>
              <h2>国別の勝敗表</h2>
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
                  <tr key={team.team}>
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Fixtures & Results</p>
              <h2>試合一覧</h2>
            </div>
          </div>

          <div className="matches">
            {dashboard.matches.map((match) => (
              <article className="match-card" key={match.id}>
                <div className="match-meta">
                  <span>{match.stage}</span>
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
                  <span>{match.statusLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
