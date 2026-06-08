import Image from "next/image";

import type { GameCard } from "@/lib/game/cards";

export function PlayingCard({
  card,
  size = "medium",
  spinning = false,
  attackShake,
}: {
  card: GameCard;
  size?: "small" | "medium" | "large";
  spinning?: boolean;
  attackShake?: "left" | "right";
}) {
  return (
    <article className={`playing-card card-${size} ${spinning ? "spinning-card" : ""} ${attackShake ? `attack-${attackShake}` : ""}`}>
      <Image className="card-image" src={card.imagePath} alt={card.name} fill sizes="(max-width: 760px) 74vw, 390px" priority={size === "large"} />
      <div className="card-shine" />
      <div className="card-rank">{card.rank}</div>
      <div className="card-center">
        <span>{card.name}</span>
      </div>
      <div className="card-stats">
        <span>ATK {card.attack}</span>
        <span>HP {card.hp}</span>
      </div>
    </article>
  );
}
