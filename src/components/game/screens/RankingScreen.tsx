import type { RankingEntry } from "@/lib/game/backend";

type RankedRow = RankingEntry & { place: number };

export function RankingScreen({ rankedRows }: { rankedRows: RankedRow[] }) {
  return (
    <section className="ranking-screen" aria-label="순위">
      <div className="screen-heading">
        <p>순위</p>
        <h2>RANKING</h2>
        <span>랭크전 승리 점수 반영</span>
      </div>
      <ol className="ranking-list">
        {rankedRows.map((entry) => (
          <li className={entry.isPlayer ? "my-rank" : ""} key={entry.name}>
            <span>{entry.place}</span>
            <strong>{entry.name}</strong>
            <em>{entry.score}</em>
          </li>
        ))}
      </ol>
    </section>
  );
}
