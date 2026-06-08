export function MatchingScreen({ matchingCountdown, pendingBattle }: { matchingCountdown: number; pendingBattle: "normal" | "ranked" | null }) {
  return (
    <section className="battle-screen" aria-label="Matching">
      <div className="screen-heading">
        <p>{pendingBattle === "normal" ? "Normal" : "Ranked"} matching</p>
        <h2 className="matching-title">MATCHING</h2>
        <span className="matching-count">Battle starts in {matchingCountdown}s</span>
      </div>
    </section>
  );
}
