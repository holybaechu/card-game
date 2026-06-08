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

    if (!attacker || !defender) {
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();
      const effectNodes = [laser, explosion, fire, ...explosionBursts, ...fireFlames].filter((node): node is HTMLElement => Boolean(node));

      timeline
        .set(effectNodes, { opacity: 0 })
        .set([attacker, defender], { transformPerspective: 900, transformOrigin: "50% 50%" })
        .set(slash, { opacity: 0, scaleX: 0.2, scaleY: 0.65, rotate: direction > 0 ? -18 : 18, x: direction * -90 })
        .to(attacker, { x: direction * 86, y: -24, rotate: direction * 11, scale: 1.12, duration: 0.13, ease: "power3.in" }, 0)
        .to(versus, { scale: 1.48, rotate: direction * 9, color: "#fff7ad", duration: 0.11, ease: "power4.out" }, 0.04)
        .to(slash, { opacity: 1, scaleX: 1.35, x: direction * 18, duration: 0.1, ease: "power4.out" }, 0.08)
        .to(defender, { x: direction * 34, y: 16, rotate: direction * 14, scale: 0.96, filter: "brightness(2.6) saturate(2.2)", duration: 0.09, ease: "power4.out" }, 0.1)
        .to(defenderHp, { scaleX: 1.08, filter: "brightness(2.4)", duration: 0.08, transformOrigin: "0% 50%" }, 0.11)
        .to(attacker, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.3, ease: "elastic.out(1, 0.45)" }, 0.17)
        .to(defender, { x: 0, y: 0, rotate: 0, scale: 1, filter: "brightness(1) saturate(1)", duration: 0.36, ease: "elastic.out(1, 0.34)" }, 0.19)
        .to(versus, { scale: 1, rotate: 0, color: "#ffffff", duration: 0.28, ease: "back.out(2)" }, 0.18)
        .to(slash, { opacity: 0, scaleX: 2.1, x: direction * 160, duration: 0.23, ease: "power2.out" }, 0.16)
        .to(defenderHp, { scaleX: 1, filter: "brightness(1)", duration: 0.22, ease: "power2.out" }, 0.2);

      if (cue.effect === "laser" && laser) {
        timeline
          .set(laser, { xPercent: -50, x: isStackedArena ? 0 : direction * 8, y: isStackedArena ? impactY / 2 : -8, rotate: laserRotation, scaleX: 0.08, scaleY: 0.8, opacity: 0 }, 0)
          .to(laser, { opacity: 1, scaleX: 1.18, scaleY: 1.25, duration: 0.08, ease: "power4.out" }, 0.06)
          .to(laser, { opacity: 0, scaleX: 1.55, scaleY: 0.4, x: isStackedArena ? 0 : direction * 74, duration: 0.18, ease: "power2.out" }, 0.15);
      }

      if (cue.effect === "explosion" && explosion) {
        timeline
          .set(explosion, { xPercent: -50, yPercent: -50, x: impactX, y: impactY, scale: 0.15, rotate: direction * 12, opacity: 0 }, 0)
          .set(explosionBursts, { scale: 0.2, opacity: 0, transformOrigin: "50% 100%" }, 0)
          .to(explosion, { opacity: 1, scale: 1.05, duration: 0.1, ease: "power4.out" }, 0.09)
          .to(explosionBursts, { opacity: 1, scale: 1, stagger: 0.012, duration: 0.09, ease: "back.out(3)" }, 0.1)
          .to(explosion, { opacity: 0, scale: 1.55, duration: 0.22, ease: "power2.out" }, 0.19)
          .to(explosionBursts, { opacity: 0, scale: 1.35, duration: 0.16, ease: "power2.out" }, 0.22);
      }

      if (cue.effect === "fire" && fire) {
        timeline
          .set(fire, { xPercent: -50, yPercent: -50, x: flameX, y: flameY, scale: 0.45, opacity: 0 }, 0)
          .set(fireFlames, { y: 20, scaleY: 0.5, opacity: 0, transformOrigin: "50% 100%" }, 0)
          .to(fire, { opacity: 1, scale: 1, duration: 0.1, ease: "power3.out" }, 0.08)
          .to(fireFlames, { opacity: 1, y: -8, scaleY: 1.2, stagger: 0.018, duration: 0.14, ease: "power3.out" }, 0.1)
          .to(fireFlames, { opacity: 0, y: -34, scaleY: 0.8, stagger: 0.012, duration: 0.18, ease: "power2.out" }, 0.24)
          .to(fire, { opacity: 0, scale: 1.14, duration: 0.16, ease: "power2.out" }, 0.28);
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
