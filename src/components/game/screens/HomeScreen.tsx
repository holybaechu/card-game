import { PlayingCard } from "@/components/game/PlayingCard";
import { fallbackCards, type GameCard } from "@/lib/game/cards";
import type { PlayerSession } from "@/lib/game/player";

type HomeScreenProps = {
  player: PlayerSession;
  cards: GameCard[];
  onOpenCards: () => void;
  onOpenGacha: () => void;
  onOpenRanking: () => void;
  onStartBattle: (mode: "normal" | "ranked") => void;
  onLogout: () => void;
};

export function HomeScreen({
  player,
  cards,
  onOpenCards,
  onOpenGacha,
  onOpenRanking,
  onStartBattle,
  onLogout,
}: HomeScreenProps) {
  return (
    <section className="home-screen" aria-label="홈">
      <div className="side-card left-card">
        <PlayingCard card={cards[15] ?? fallbackCards[0]} size="large" spinning />
      </div>
      <div className="home-center">
        <p className="owner-name">
          {player.nickname} / 점수 {player.score}
        </p>
        <h1 className="game-title">
          배준후
          카드
          게임
        </h1>
        <button className="neon-button compact home-logout-button mb-4" onClick={onLogout} type="button">
          로그아웃
        </button>
        <nav className="home-menu" aria-label="메인 게임 메뉴">
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
            랭킹
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
