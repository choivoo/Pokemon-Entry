import { createRewardModifierType, drawRewards, getRewardCatalog, isRewardUsable } from "#app/math/math-rewards";
import { ModifierTier } from "#enums/modifier-tier";
import { SpeciesId } from "#enums/species-id";
import { GameManager } from "#test/framework/game-manager";
import { seeded } from "#test/math/seeded-rng";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("수학 보상 목록", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
  });

  it("보상은 500종 이상이고 id가 모두 다르다", () => {
    const all = getRewardCatalog();
    const counts: Record<string, number> = {};
    for (const d of all) {
      counts[d.category] = (counts[d.category] ?? 0) + 1;
    }
    console.log("보상 종류:", all.length, counts);
    expect(all.length).toBeGreaterThanOrEqual(500);
    expect(new Set(all.map(d => d.id)).size).toBe(all.length);
    for (const r of [
      ModifierTier.COMMON,
      ModifierTier.GREAT,
      ModifierTier.ULTRA,
      ModifierTier.ROGUE,
      ModifierTier.MASTER,
    ]) {
      expect(all.some(d => d.rarity === r)).toBe(true);
    }
  });

  it("모든 아이템 보상은 실제 원본 아이템으로 만들어지고 이름과 아이콘이 있다", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.EEVEE);
    const party = game.scene.getPlayerParty();
    const failed: string[] = [];
    let made = 0;
    for (const def of getRewardCatalog()) {
      if (def.kind !== "item") {
        continue;
      }
      const type = createRewardModifierType(def, party);
      // 폼체인지·전용 도구 등은 파티와 상관없이 만들어져야 한다
      if (!type || !type.name || !type.iconImage) {
        failed.push(def.id);
        continue;
      }
      made++;
    }
    expect(failed).toEqual([]);
    expect(made).toBeGreaterThan(450);
  });

  it("뽑기: 개수만큼 서로 다른 보상, 최소 등급 지키기, 쓸모 없는 것은 빼기", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const party = game.scene.getPlayerParty();
    const rng = seeded(11);
    for (let i = 0; i < 40; i++) {
      const draw = drawRewards(8, { wave: 30, rng, usable: d => isRewardUsable(d, party) });
      expect(draw).toHaveLength(8);
      expect(new Set(draw.map(d => d.id)).size).toBe(8);
      for (const d of draw) {
        expect(isRewardUsable(d, party)).toBe(true);
      }
    }
    const jackpot = drawRewards(8, { wave: 5, minRarity: ModifierTier.ULTRA, rng });
    expect(jackpot.every(d => d.rarity >= ModifierTier.ULTRA)).toBe(true);
  });

  it("피카츄는 전기구슬을 쓸 수 있지만 굵은뼈는 못 쓴다", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const party = game.scene.getPlayerParty();
    const find = (key: string) => getRewardCatalog().find(d => d.id === `SPECIES_STAT_BOOSTER:${key}`)!;
    expect(isRewardUsable(find("LIGHT_BALL"), party)).toBe(true);
    expect(isRewardUsable(find("THICK_CLUB"), party)).toBe(false);
  });
});
