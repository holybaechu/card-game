import { PlayingCard } from "@/components/game/PlayingCard";
import { fallbackCards, type GameCard } from "@/lib/game/cards";
import type { PlayerSession } from "@/lib/game/backend";

export function HomeScreen({
  cards,
  player,
  onLogout,
  onOpenCards,
  onOpenGacha,
  onOpenRanking,
  onStartBattle,
}: {
  cards: GameCard[];
  player: PlayerSession;
  onLogout: () => void;
  onOpenCards: () => void;
  onOpenGacha: () => void;
  onOpenRanking: () => void;
  onStartBattle: (mode: "normal" | "ranked") => void;
}) {
  return (
    <section className="home-screen" aria-label="???붾㈃">
      <div className="side-card left-card">
        <PlayingCard card={cards[15] ?? fallbackCards[0]} size="large" spinning />
      </div>
      <div className="home-center">
        <p className="owner-name">{player.nickname}</p>
        <p className="owner-score">Score {player.score}</p>
        <h1 className="game-title">
          CARD
          <br />
          GAME
        </h1>
        <nav className="home-menu" aria-label="寃뚯엫 硫붾돱">
          <button className="neon-button" onClick={() => onStartBattle("normal")} type="button">
            ?쇰컲??
          </button>
          <button className="neon-button" onClick={() => onStartBattle("ranked")} type="button">
            ??겕??
          </button>
          <button className="neon-button" onClick={onOpenCards} type="button">
            移대뱶
          </button>
          <button className="neon-button" onClick={onOpenRanking} type="button">
            ?쒖쐞
          </button>
          <button className="neon-button gacha-home-button" onClick={onOpenGacha} type="button">
            媛梨?
          </button>
          <button className="neon-button" onClick={onLogout} type="button">
            로그아웃
          </button>
        </nav>
      </div>
      <div className="side-card right-card">
        <PlayingCard card={cards[13] ?? fallbackCards[1]} size="large" spinning />
      </div>
    </section>
  );
}
