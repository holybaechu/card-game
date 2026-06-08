import { PlayingCard } from "@/components/game/PlayingCard";
import { battleAnimationForTick } from "@/lib/game/animation";
import { hpPercent, type BattleState } from "@/lib/game/battle";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";

export function BattleScreen({ battle, rankedScore, screen }: { battle: BattleState; rankedScore: number; screen: "normal" | "ranked" }) {
  const arenaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const arena = arenaRef.current;
    const cue = battle.status === "running" ? battleAnimationForTick(battle.tick) : null;

    if (!arena || !cue) {
      return;
    }

    const attacker = arena.querySelector<HTMLElement>(`[data-fighter="${cue.attacker}"] .playing-card`);
    const defender = arena.querySelector<HTMLElement>(`[data-fighter="${cue.defender}"] .playing-card`);
    const defenderHp = arena.querySelector<HTMLElement>(`[data-fighter="${cue.defender}"] .hp-frame span`);
    const versus = arena.querySelector<HTMLElement>(".versus");
    const slash = arena.querySelector<HTMLElement>(".battle-slash");
    const laser = arena.querySelector<HTMLElement>(".battle-laser");
    const explosion = arena.querySelector<HTMLElement>(".battle-explosion");
    const explosionBursts = Array.from(arena.querySelectorAll<HTMLElement>(".battle-explosion span"));
    const fire = arena.querySelector<HTMLElement>(".battle-fire");
    const fireFlames = Array.from(arena.querySelectorAll<HTMLElement>(".battle-fire span"));
    const direction = cue.attacker === "player" ? 1 : -1;
    const isStackedArena = arena.clientWidth < 680;
    const defenderStackOffset = cue.defender === "enemy" ? 205 : -205;
    const impactX = isStackedArena ? 0 : direction * 230;
    const impactY = isStackedArena ? defenderStackOffset : 0;
    const flameX = isStackedArena ? 0 : direction * 210;
    const flameY = isStackedArena ? defenderStackOffset + 34 : 34;
    const laserRotation = isStackedArena ? (cue.defender === "enemy" ? 90 : -90) : direction > 0 ? -4 : 184;
    const hitIntensity = isStackedArena ? 8 : 12;
    const lungeDistance = isStackedArena ? 96 : 132;
    const recoilDistance = isStackedArena ? 44 : 56;
    const effectSpread = isStackedArena ? 0.06 : 0.12;

    if (!attacker || !defender) {
      return;
    }

    const effectNodes = [slash, laser, explosion, ...explosionBursts, fire, ...fireFlames].filter((node): node is HTMLElement => Boolean(node));

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const ctx = gsap.context(() => {
        gsap.set([attacker, defender], { filter: "brightness(1.02)" });
        gsap.set(effectNodes, { opacity: 0, scale: 1, rotate: 0, x: 0, y: 0, filter: "brightness(1)" });
        gsap.set(defenderHp, { filter: "brightness(1)" });
      }, arena);

      return () => ctx.revert();
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      const effectNodes = [laser, explosion, fire, ...explosionBursts, ...fireFlames].filter((node): node is HTMLElement => Boolean(node));

      timeline
        .set(effectNodes, { opacity: 0 })
        .set([attacker, defender], { transformPerspective: 900, transformOrigin: "50% 50%" })
        .set(slash, { opacity: 0, scaleX: 0.18, scaleY: 0.6, rotate: direction > 0 ? -22 : 22, x: direction * -98 })
        .set(arena, { x: 0, y: 0, rotate: 0 })
        .to(attacker, { x: direction * lungeDistance, y: -20, rotate: direction * (12 + hitIntensity), scale: 1.16, duration: 0.34 }, 0)
        .to(slash, { opacity: 1, scaleX: 1.52, x: direction * 20, duration: 0.27 }, 0.02)
        .to(versus, { scale: 1.5, rotate: direction * (11 + hitIntensity), color: "#fff7ad", duration: 0.29 }, 0.04)
        .to(defender, { x: direction * recoilDistance, y: 10, rotate: direction * (16 + hitIntensity), scale: 0.95, filter: "brightness(2.6) saturate(2.2)", duration: 0.28 }, 0.07)
        .to(defenderHp, { scaleX: 1.1, filter: "brightness(2.4)", duration: 0.26, transformOrigin: cue.defender === "player" ? "100% 50%" : "0% 50%" }, 0.08)
        .to(
          arena,
          { x: direction * (4 + hitIntensity * 2), y: hitIntensity >= 8 ? 2 : 0, duration: 0.24, ease: "sine.inOut" },
          0.1,
        )
        .to(attacker, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.42 }, 0.2)
        .to(defender, { x: 0, y: 0, rotate: 0, scale: 1.01, filter: "brightness(1) saturate(1)", duration: 0.42 }, 0.22)
        .to(versus, { scale: 1, rotate: 0, color: "#ffffff", duration: 0.35 }, 0.2)
        .to(slash, { opacity: 0, scaleX: 2.2, x: direction * (recoilDistance + 96), duration: 0.34 }, 0.32)
        .to(defenderHp, { scaleX: 1, filter: "brightness(1)", duration: 0.36 }, 0.26)
        .to(arena, { x: direction * (-(4 + hitIntensity * 1.4)), y: -2, duration: 0.24, ease: "sine.inOut" }, 0.26)
        .to(arena, { x: 0, y: 0, duration: 0.38, ease: "elastic.out(1, 0.72)" }, 0.52);

      if (cue.effect === "laser" && laser) {
        timeline
          .set(laser, { xPercent: -50, x: isStackedArena ? 0 : direction * 8, y: isStackedArena ? impactY / 2 : -8, rotate: laserRotation, scaleX: 0.08, scaleY: 0.8, opacity: 0 }, 0.09)
          .to(laser, { opacity: 1, scaleX: 1.36, scaleY: 1.22, duration: 0.29 }, 0.1)
          .to(laser, { opacity: 0, scaleX: 1.72, scaleY: 0.32, x: isStackedArena ? 0 : direction * (74 + effectSpread * 420), duration: 0.39 }, 0.18);
      }

      if (cue.effect === "explosion" && explosion) {
        timeline
          .set(explosion, { xPercent: -50, yPercent: -50, x: impactX, y: impactY, scale: 0.15, rotate: direction * 12, opacity: 0 }, 0.04)
          .set(explosionBursts, { scale: 0.2, opacity: 0, transformOrigin: "50% 100%" }, 0)
          .to(explosion, { opacity: 1, scale: 1.08, duration: 0.24 }, 0.07)
          .to(explosionBursts, { opacity: 1, scale: 1, stagger: 0.018, duration: 0.18, ease: "back.out(3)" }, 0.12)
          .to(explosion, { opacity: 0, scale: 1.72, duration: 0.49 }, 0.2)
          .to(explosionBursts, { opacity: 0, scale: 1.45, duration: 0.44 }, 0.24);
      }

      if (cue.effect === "fire" && fire) {
        timeline
          .set(fire, { xPercent: -50, yPercent: -50, x: flameX, y: flameY, scale: 0.45, opacity: 0 }, 0)
          .set(fireFlames, { y: 20, scaleY: 0.5, opacity: 0, transformOrigin: "50% 100%" }, 0)
          .to(fire, { opacity: 1, scale: 1, duration: 0.24 }, 0.12)
          .to(fireFlames, { opacity: 1, y: -8, scaleY: 1.2, stagger: 0.03, duration: 0.27 }, 0.14)
          .to(fire, { opacity: 0.85, scale: 1.14, duration: 0.27 }, 0.24)
          .to(fireFlames, { opacity: 0, y: -34, scaleY: 0.8, stagger: 0.02, duration: 0.34 }, 0.32)
          .to(fire, { opacity: 0, scale: 1.34, duration: 0.29 }, 0.38);
      }
    }, arena);

    return () => ctx.revert();
  }, [battle.status, battle.tick]);

  return (
    <section className="battle-screen" aria-label={screen === "normal" ? "일반전" : "랭크전"}>
      <div className="screen-heading">
        <p>{screen === "normal" ? "일반전" : "랭크전"}</p>
        <h2>{battle.status === "running" ? "AUTO BATTLE" : battle.status === "player-win" ? "WIN" : battle.status === "enemy-win" ? "LOSE" : "DRAW"}</h2>
        <span>{screen === "ranked" ? `현재 점수 ${rankedScore}` : "1초마다 자동 공격"}</span>
      </div>

      <div className="battle-arena" ref={arenaRef}>
        <div className="battle-slash" aria-hidden="true" />
        <div className="battle-laser" aria-hidden="true" style={{ opacity: 0 }} />
        <div className="battle-explosion" aria-hidden="true" style={{ opacity: 0 }}>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="battle-fire" aria-hidden="true" style={{ opacity: 0 }}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="fighter" data-fighter="player">
          <PlayingCard card={battle.player} size="medium" />
          <div className="hp-frame" aria-label={`내 체력 ${battle.playerHp}`}>
            <span style={{ width: `${hpPercent(battle.playerHp, battle.player.hp)}%` }} />
          </div>
          <strong>{battle.player.name}</strong>
        </div>

        <div className="versus">VS</div>

        <div className="fighter" data-fighter="enemy">
          <PlayingCard card={battle.enemy} size="medium" />
          <div className="hp-frame enemy-hp" aria-label={`상대 체력 ${battle.enemyHp}`}>
            <span style={{ width: `${hpPercent(battle.enemyHp, battle.enemy.hp)}%` }} />
          </div>
          <strong>{battle.enemy.name}</strong>
        </div>
      </div>

      <div className="battle-actions">{screen === "ranked" && battle.status === "player-win" && <p>승리 보상 +25점</p>}</div>
    </section>
  );
}
