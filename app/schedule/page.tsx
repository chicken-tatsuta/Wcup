import Link from "next/link";
import { MatchList } from "@/app/match-list";
import { getWorldCupDashboard } from "@/lib/fifa";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const dashboard = await getWorldCupDashboard();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">Schedule</p>
            <h1>全試合スケジュール</h1>
            <p className="hero-copy">
              FIFA公開データから取得した全試合を時系列で一覧表示しています。
            </p>
          </div>
          <Link className="panel-link" href="/">
            ホームに戻る
          </Link>
        </div>
      </section>

      <section className="content-grid schedule-layout">
        <MatchList
          kicker="All Matches"
          matches={dashboard.matches}
          title={`全${dashboard.matches.length}試合`}
        />
      </section>
    </main>
  );
}
