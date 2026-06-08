import { PlayingCard } from "@/components/game/PlayingCard";
import { fallbackCards, type GameCard } from "@/lib/game/cards";

export function HomeScreen({
  cards,
  onOpenCards,
  onOpenGacha,
  onOpenRanking,
  onStartBattle,
}: {
  cards: GameCard[];
  onOpenCards: () => void;
  onOpenGacha: () => void;
  onOpenRanking: () => void;
  onStartBattle: (mode: "normal" | "ranked") => void;
}) {
  return (
    <section className="home-screen" aria-label="홈 화면">
      <div className="side-card left-card">
        <PlayingCard card={cards[15] ?? fallbackCards[0]} size="large" spinning />
      </div>
      <div className="home-center">
        <p className="owner-name">배준후</p>
        <h1 className="game-title">
          CARD
          <br />
          GAME
        </h1>
        <nav className="home-menu" aria-label="게임 메뉴">
          <button className="neon-button" onClick={() => onStartBattle("normal")} type="button">
            일반전
          </button>
          <button className="neon-button" onClick={() => onStartBattle("ranked")} type="button">
            랭크전
          </button>
          <button className="neon-button" onClick={onOpenCards} type="button">
            카드
          </button>
          <button className="neon-button" onClick={onOpenRanking} type="button">
            순위
          </button>
          <button className="neon-button gacha-home-button" onClick={onOpenGacha} type="button">
            가챠
          </button>
        </nav>
      </div>
      <div className="side-card right-card">
        <PlayingCard card={cards[13] ?? fallbackCards[1]} size="large" spinning />
      </div>
    </section>
  );
}
