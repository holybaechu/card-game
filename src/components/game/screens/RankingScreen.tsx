import type { RankingEntry } from "@/lib/game/backend";

export function RankingScreen({ rankedRows }: { rankedRows: RankingEntry[] }) {
  return (
    <section className="ranking-screen" aria-label="랭킹">
      <div className="screen-heading">
        <p>랭킹</p>
        <h2>랭킹</h2>
        <span>상위 점수</span>
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

