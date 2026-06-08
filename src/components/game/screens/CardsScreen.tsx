import { PlayingCard } from "@/components/game/PlayingCard";
import type { GameCard } from "@/lib/game/cards";
import { getInventoryQuantity, type InventoryEntry } from "@/lib/game/inventory";

export function CardsScreen({ cards, inventory }: { cards: GameCard[]; inventory: InventoryEntry[] }) {
  return (
    <section className="collection-screen" aria-label="카드 도감">
      <div className="screen-heading">
        <p>카드</p>
        <h2>CARD COLLECTION</h2>
      </div>
      <div className="card-grid">
        {cards.map((card) => (
          <div className="inventory-card" key={card.id}>
            <PlayingCard card={card} size="small" />
            <span className="inventory-count">x{getInventoryQuantity(inventory, card.id)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
