import { DEFAULT_PROFILE, setActiveProfile } from "#app/edu/profile";
import { BattleType } from "#enums/battle-type";
import { Command } from "#enums/command";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import type { CommandPhase } from "#phases/command-phase";
import { currentUsername, mathGateHooks, resetMathGateState } from "#phases/math-gate-phase";
import { MathRewardPhase } from "#phases/math-reward-phase";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const gate = vi.hoisted(() => ({ calls: [] as number[], perfect: true }));

describe("수학 관문 - 게임 흐름", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    gate.calls = [];
    resetMathGateState();
    setActiveProfile(currentUsername(), {
      ...DEFAULT_PROFILE,
      school: { code: "manual:테스트초등학교", name: "테스트초등학교", region: "" },
      className: "1",
    });
    gate.perfect = true;
    // 화면 대신 바로 정답 처리
    vi.spyOn(mathGateHooks, "show").mockImplementation(opts => {
      gate.calls.push(opts.wave);
      return Promise.resolve({
        perfect: gate.perfect,
        misses: gate.perfect ? 0 : 1,
        hints: 0,
        level: 2,
        kind: "gugu",
        timeouts: 0,
      });
    });
    // 이 파일은 관문 흐름만 본다: 보상 단계는 바로 끝낸다 (보상은 math-reward-flow.test.ts)
    vi.spyOn(MathRewardPhase.prototype, "start").mockImplementation(function (this: MathRewardPhase) {
      this.end();
    });
    game = new GameManager(phaserGame);
    game.override
      .mathGate(true)
      .startingWave(3)
      .startingLevel(100)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyMoveset(MoveId.SPLASH)
      .battleStyle("single");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("승리하면 관문 → 보상 → 아이템 선택 → 다음 층 전투 순서로 진행되고, 한 번에 맞히면 보상 기회가 2번이다", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const unshift = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("MathRewardPhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    expect(gate.calls).toEqual([3]);
    expect(unshift.mock.calls.filter(c => c[0] === "MathRewardPhase")).toHaveLength(2);

    await game.toNextWave();
    expect(game.scene.currentBattle.waveIndex).toBe(4);
    expect(gate.calls).toEqual([3]); // 한 층에 한 번만
  });

  it("틀린 적이 있으면 보상 기회는 1번", async () => {
    gate.perfect = false;
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const unshift = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    expect(unshift.mock.calls.filter(c => c[0] === "MathRewardPhase")).toHaveLength(1);
  });

  it("포켓몬을 잡아서 끝나도 다음 층 전에 관문이 나온다", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const partySize = game.scene.getPlayerParty().length;
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.toNextWave();
    expect(game.scene.getPlayerParty()).toHaveLength(partySize + 1);
    expect(gate.calls).toEqual([3]);
    expect(game.scene.currentBattle.waveIndex).toBe(4);
  });

  it("도망쳐도 다음 층 전에 관문이 나온다 (NewBattlePhase 안전장치)", async () => {
    game.override.battleType(BattleType.WILD);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    vi.spyOn(game.scene, "randBattleSeedInt").mockReturnValue(0); // 도주 성공
    const commandPhase = game.scene.phaseManager.getCurrentPhase() as CommandPhase;
    commandPhase.handleCommand(Command.RUN, 0);
    await game.phaseInterceptor.to("NewBattlePhase", false);
    expect(game.scene.phaseManager.hasPhaseOfType("SelectModifierPhase")).toBe(false);
    await game.phaseInterceptor.to("CommandPhase");
    expect(gate.calls).toEqual([3]);
    expect(game.scene.currentBattle.waveIndex).toBe(4);
  });
});
