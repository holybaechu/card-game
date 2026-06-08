import { PlayingCard } from "@/components/game/PlayingCard";
import { gachaAnimationLayout, gachaRevealTiming } from "@/lib/game/animation";
import type { GameCard } from "@/lib/game/cards";
import type { InventoryDrawInput } from "@/lib/game/inventory";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";

export function GachaScreen({
  gachaCards,
  gachaCount,
  isDrawing,
  onStartGacha,
}: {
  gachaCards: GameCard[];
  gachaCount: InventoryDrawInput["count"];
  isDrawing: boolean;
  onStartGacha: (count: InventoryDrawInput["count"]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layout = gachaAnimationLayout(gachaCount);
  const revealTiming = gachaRevealTiming(gachaCount);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || gachaCards.length === 0) {
      return;
    }

    const cards = stage.querySelectorAll<HTMLElement>(".gacha-card-pop");
    const latestCard = cards[cards.length - 1];
    const flash = stage.querySelector<HTMLElement>(".gacha-flash");
    const rings = stage.querySelectorAll<HTMLElement>(".gacha-ring");

    if (!latestCard) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const cleanup = gsap.context(() => {
        gsap.set(latestCard, {
          opacity: 1,
          scale: 1,
          rotate: 0,
          rotateY: 0,
          x: 0,
          y: 0,
          filter: "brightness(1) saturate(1)",
          transformPerspective: 900,
          transformOrigin: "50% 50%",
        });
        gsap.set(flash, { opacity: 0, scale: 1 });
        gsap.set(rings, { opacity: 0, scale: 1, rotate: 0 });
      }, stage);

      return () => cleanup.revert();
    }

    const drift = gachaCount === 1 ? 0 : (cards.length % 2 === 0 ? -1 : 1) * gsap.utils.random(18, 52);
    const spin = gachaCount === 1 ? 900 : gsap.utils.random(360, 720);
    const flashDuration = revealTiming.effectSeconds * 0.31;
    const ringDuration = revealTiming.effectSeconds * 0.47;
    const settleDuration = revealTiming.effectSeconds * 0.38;
    const settleScale = gachaCount === 1 ? 1.12 : 1.24;
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      timeline
        .set(latestCard, {
          opacity: 0,
          scale: gachaCount === 1 ? 0.28 : 0.18,
          rotate: gsap.utils.random(-32, 32),
          rotateY: spin,
          x: drift,
          y: gachaCount === 1 ? -130 : -60,
          filter: "brightness(3.2) saturate(2.4) hue-rotate(80deg)",
          transformPerspective: 900,
          transformOrigin: "50% 50%",
        })
        .to(flash, { opacity: 0.95, scale: gachaCount === 1 ? 1.75 : 1.1, duration: flashDuration, ease: "power1.out" }, 0)
        .to(rings, { opacity: 0.85, scale: gachaCount === 1 ? 1.35 : 0.9, rotate: 180, stagger: 0.035, duration: ringDuration, ease: "expo.out" }, 0)
        .to(
          latestCard,
          {
            opacity: 1,
            scale: gachaCount === 1 ? 1.08 : 1.18,
            rotate: gsap.utils.random(-7, 7),
            rotateY: 0,
            x: 0,
            y: 0,
            filter: "brightness(1.7) saturate(1.7)",
            duration: settleDuration,
            ease: "back.out(2.8)",
          },
          0.02,
        )
        .to(
          latestCard,
          {
            scale: settleScale,
            filter: "brightness(1) saturate(1)",
            duration: Math.max(0.18, revealTiming.effectSeconds * 0.28),
            ease: "elastic.out(1, 0.45)",
          },
          ">-0.04",
        )
        .to(latestCard, { scale: 1, duration: settleDuration * 0.62, ease: "elastic.out(1, 0.45)" }, `>-${revealTiming.effectSeconds * 0.1}`)
        .to(flash, { opacity: 0, scale: gachaCount === 1 ? 2.4 : 1.6, duration: flashDuration * 1.25, ease: "power3.out" }, 0.08)
        .to(rings, { opacity: 0, scale: gachaCount === 1 ? 2.1 : 1.4, rotate: 420, duration: flashDuration * 1.56, ease: "power3.out" }, 0.12);
    }, stage);

    return () => ctx.revert();
  }, [gachaCards.length, gachaCount, revealTiming.effectSeconds]);

  return (
    <section className="gacha-screen" aria-label="가챠">
      <div className="screen-heading">
        <p>가챠</p>
        <h2>카드 뽑기</h2>
        <span>{isDrawing ? `카드 뽑는 중 ${gachaCards.length}/${gachaCount}` : "뽑을 카드 수를 선택하세요"}</span>
      </div>

      <div className="gacha-stage" ref={stageRef}>
        <div className="gacha-flash" aria-hidden="true" />
        <div className="gacha-ring gacha-ring-one" aria-hidden="true" />
        <div className="gacha-ring gacha-ring-two" aria-hidden="true" />
        <div className="gacha-buttons">
          <button className="neon-button gacha-draw-button" onClick={() => onStartGacha(1)} disabled={isDrawing} type="button">
            1장 뽑기
          </button>
          <button className="neon-button gacha-draw-button" onClick={() => onStartGacha(10)} disabled={isDrawing} type="button">
            10장 뽑기
          </button>
          <button className="neon-button gacha-draw-button" onClick={() => onStartGacha(100)} disabled={isDrawing} type="button">
            100장 뽑기
          </button>
        </div>

        <div className={layout.gridClass} aria-live="polite">
          {gachaCards.map((card, index) => (
            <div className={layout.cardClass} key={`${card.id}-${index}`}>
              <PlayingCard card={card} size="small" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
