import type { RankingEntry } from "@/lib/game/backend";

export function RankingScreen({ rankedRows }: { rankedRows: RankingEntry[] }) {
  return (
    <section className="ranking-screen" aria-label="Ranking">
      <div className="screen-heading">
        <p>Ranking</p>
        <h2>RANKING</h2>
        <span>Top scores</span>
      </div>
      <ol className="ranking-list">
        {rankedRows.map((entry) => (
          <li className={entry.isActivePlayer ? "my-rank" : ""} key={entry.id}>
            <span>{entry.place}</span>
            <strong>{entry.nickname}</strong>
            <em>{entry.score}</em>
          </li>
        ))}
      </ol>
    </section>
  );
}

