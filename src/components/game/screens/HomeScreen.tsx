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
    <section className="home-screen" aria-label="Home">
      <div className="side-card left-card">
        <PlayingCard card={cards[15] ?? fallbackCards[0]} size="large" spinning />
      </div>
      <div className="home-center">
        <p className="owner-name">
          {player.nickname} · {player.score}
        </p>
        <h1 className="game-title">
          CARD
          <br />
          GAME
        </h1>
        <button className="neon-button compact home-logout-button" onClick={onLogout} type="button">
          Logout
        </button>
        <nav className="home-menu" aria-label="Main game menu">
          <button className="neon-button" onClick={() => onStartBattle("normal")} type="button">
            Normal
          </button>
          <button className="neon-button" onClick={() => onStartBattle("ranked")} type="button">
            Ranked
          </button>
          <button className="neon-button" onClick={onOpenCards} type="button">
            Cards
          </button>
          <button className="neon-button" onClick={onOpenRanking} type="button">
            Ranking
          </button>
          <button className="neon-button gacha-home-button" onClick={onOpenGacha} type="button">
            Gacha
          </button>
        </nav>
      </div>
      <div className="side-card right-card">
        <PlayingCard card={cards[13] ?? fallbackCards[1]} size="large" spinning />
      </div>
    </section>
  );
}

