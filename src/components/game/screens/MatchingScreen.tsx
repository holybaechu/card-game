export function MatchingScreen({ matchingCountdown, pendingBattle }: { matchingCountdown: number; pendingBattle: "normal" | "ranked" | null }) {
  return (
    <section className="battle-screen" aria-label="매칭">
      <div className="screen-heading">
        <p>{pendingBattle === "normal" ? "일반전" : "랭크전"} 매칭</p>
        <h2 className="matching-title">매칭 중</h2>
        <span className="matching-count">{matchingCountdown}초 후 전투 시작</span>
      </div>
    </section>
  );
}
