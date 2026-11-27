import { getRewardCatalog, type RewardDef } from "#app/math/math-rewards";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import { ExpBoosterModifier } from "#modifiers/modifier";
import { mathGateHooks, planRewards, resetMathGateState } from "#phases/math-gate-phase";
import { MathRewardPhase, mathRewardHooks } from "#phases/math-reward-phase";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const find = (id: string): RewardDef => {
  const def = getRewardCatalog().find(d => d.id === id);
  if (!def) {
    throw new Error(`no reward ${id}`);
  }
  return def;
};

describe("수학 관문 보상", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  let shown: { mode: string; cards: number }[];

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    resetMathGateState();
    shown = [];
    game = new GameManager(phaserGame);
    game.override
      .mathGate(true)
      .startingWave(3)
      .startingLevel(100)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyMoveset(MoveId.SPLASH)
      .battleStyle("single");
    vi.spyOn(mathGateHooks, "show").mockResolvedValue({ perfect: true, misses: 0, hints: 0 });
    // 보상 화면 대신 항상 첫 번째 보상을 받는다
    vi.spyOn(mathRewardHooks, "show").mockImplementation(opts => {
      shown.push({ mode: opts.mode, cards: opts.cards.length });
      for (const card of opts.cards) {
        expect(card.name.length).toBeGreaterThan(0);
        expect(card.icon).toMatch(/^\.\/images\/items\/[a-z0-9_]+\.png$/);
      }
      return Promise.resolve(0);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("보상 계획: 정답 1번, 한 번에 맞히면 +1번, 연속 5번마다 잭팟", () => {
    expect(planRewards(false, 0)).toHaveLength(1);
    expect(planRewards(true, 1)).toHaveLength(2);
    expect(planRewards(true, 5)).toEqual(expect.arrayContaining(["jackpot"]));
    expect(planRewards(true, 5)).toHaveLength(3);
    expect(planRewards(true, 6)).not.toContain("jackpot");
  });

  it("승리 → 관문 → 한 번에 정답이면 보상 기회 2번이 아이템 고르기보다 먼저 온다", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const unshift = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase");
    const rewardPhases = unshift.mock.calls.filter(c => c[0] === "MathRewardPhase");
    expect(rewardPhases).toHaveLength(2);
    await game.phaseInterceptor.to("MathRewardPhase");
    expect(shown).toHaveLength(1);
    expect(shown[0].cards).toBe(shown[0].mode === "roulette" ? 8 : 3);
  });

  async function runReward(def: RewardDef) {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const unshift = vi.spyOn(game.scene.phaseManager, "unshiftNew").mockImplementation(() => {});
    const phase = new MathRewardPhase("choice", 0, [def]);
    const end = vi.spyOn(phase, "end");
    vi.spyOn(game.scene.ui, "showText").mockImplementation((_t, _d, cb) => cb?.());
    phase.start();
    await vi.waitFor(() => expect(end).toHaveBeenCalled());
    return unshift.mock.calls;
  }

  it("돈 보상: 그 층 상금 × 배수만큼 받는다", async () => {
    const def = find("money:3");
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const before = game.scene.money;
    const expected = game.scene.getWaveMoneyAmount(3);
    const phase = new MathRewardPhase("choice", 0, [def]);
    vi.spyOn(game.scene.ui, "showText").mockImplementation((_t, _d, cb) => cb?.());
    const end = vi.spyOn(phase, "end");
    phase.start();
    await vi.waitFor(() => expect(end).toHaveBeenCalled());
    expect(game.scene.money).toBe(before + expected);
  });

  it("몬스터볼 보상: 가방에 바로 들어간다", async () => {
    await runReward(find(`balls:${PokeballType.ULTRA_BALL}:3`));
    expect(game.scene.pokeballCounts[PokeballType.ULTRA_BALL]).toBeGreaterThanOrEqual(3);
  });

  it("바로 쓰는 아이템(학습장치 류): 바로 지급된다", async () => {
    await runReward(find("EXP_CHARM"));
    expect(game.scene.findModifier(m => m instanceof ExpBoosterModifier)).toBeDefined();
  });

  it("포켓몬에게 주는 아이템(기술머신): 원본 아이템 고르기 화면에 그 아이템 하나만 나온다", async () => {
    const tm = getRewardCatalog().find(
      d => d.category === "tm" && d.kind === "item" && d.args?.[0] === MoveId.THUNDERBOLT,
    )!;
    const calls = await runReward(tm);
    const select = calls.find(c => c[0] === "SelectModifierPhase");
    const settings = select?.[3] as {
      guaranteedModifierTypeOptions: { type: { name: string } }[];
      rerollMultiplier: number;
    };
    expect(settings.guaranteedModifierTypeOptions).toHaveLength(1);
    expect(settings.rerollMultiplier).toBe(-1);
  });

  it("아이템 선택 찬스: 정해진 등급으로 원본 아이템 고르기 화면이 열린다", async () => {
    const def = getRewardCatalog().find(d => d.kind === "shop" && d.tiers.length === 4)!;
    const calls = await runReward(def);
    const select = calls.find(c => c[0] === "SelectModifierPhase");
    expect((select?.[3] as { guaranteedModifierTiers: number[] }).guaranteedModifierTiers).toEqual(
      def.kind === "shop" ? def.tiers : [],
    );
  });

  it("룰렛권: 그 수만큼 룰렛 보상이 이어진다", async () => {
    const calls = await runReward(find("roulette:3"));
    expect(calls.filter(c => c[0] === "MathRewardPhase")).toHaveLength(3);
  });
});
