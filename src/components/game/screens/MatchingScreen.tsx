export function MatchingScreen({ matchingCountdown, pendingBattle }: { matchingCountdown: number; pendingBattle: "normal" | "ranked" | null }) {
  return (
    <section className="battle-screen" aria-label="매칭중">
      <div className="screen-heading">
        <p>{pendingBattle === "normal" ? "일반전" : "랭크전"} 매칭중</p>
        <h2 className="matching-title">MATCHING</h2>
        <span className="matching-count">{matchingCountdown}초 뒤 전투 시작</span>
      </div>
    </section>
  );
}
