import { DIFFICULTY_RULES } from "#app/edu/difficulty";
import { clearActiveProfile, DEFAULT_PROFILE, setActiveProfile } from "#app/edu/profile";
import { rankingHooks } from "#app/edu/ranking";
import { loadStats } from "#app/edu/stats";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { currentUsername, mathGateHooks, resetMathGateState } from "#phases/math-gate-phase";
import { MathRewardPhase } from "#phases/math-reward-phase";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("관문 ↔ 학습 설정 · 점수 · 랭킹", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  const real = { ...rankingHooks };

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    localStorage.clear();
    clearActiveProfile();
    resetMathGateState();
    game = new GameManager(phaserGame);
    game.override
      .mathGate(true)
      .startingWave(3)
      .startingLevel(100)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyMoveset(MoveId.SPLASH)
      .battleStyle("single");
    vi.spyOn(MathRewardPhase.prototype, "start").mockImplementation(function (this: MathRewardPhase) {
      this.end();
    });
  });

  afterEach(() => {
    Object.assign(rankingHooks, real);
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const profile = (over: Partial<typeof DEFAULT_PROFILE> = {}) => ({
    ...DEFAULT_PROFILE,
    school: { code: "T10:1234567", name: "테스트초등학교", region: "" },
    className: "여울반",
    studentNo: 6,
    ...over,
  });

  it("내가 고른 과목·학년·난이도로 문제를 내고, 점수를 기록하고, 랭킹 서버에 올린다", async () => {
    setActiveProfile(
      currentUsername(),
      profile({
        subject: "kor",
        grade: 5,
        semester: 1,
        difficulty: "hard",
        rankingConsent: true,
        units: ["속담", "반대말"],
      }),
    );
    const post = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    rankingHooks.url = () => "https://example.supabase.co";
    rankingHooks.key = () => "k".repeat(40);
    rankingHooks.fetch = post;

    let captured: Parameters<typeof mathGateHooks.show>[0] | undefined;
    vi.spyOn(mathGateHooks, "show").mockImplementation(opts => {
      captured = opts;
      return Promise.resolve({ perfect: true, misses: 0, hints: 0, level: 3, kind: "antonym", timeouts: 0 });
    });

    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);

    expect(captured?.rule).toEqual(DIFFICULTY_RULES.hard);
    expect(captured?.lang).toBe("ko");
    for (let i = 0; i < 20; i++) {
      const q = captured!.question!(undefined);
      expect(q.subject).toBe("kor");
      expect(["속담", "반대말"]).toContain(q.category); // 고른 단원만
    }
    // 점수 기록 (3수준 · 하드 ×2 · 한 번에 정답 +5 · 연속 1)
    const kor = loadStats(currentUsername()).kor;
    expect(kor).toMatchObject({ solved: 1, perfect: 1, bestWave: 4, bestStreak: 1 });
    expect(kor.points).toBe(Math.round((10 * 3 + 5 + 1) * 2));
    expect(loadStats(currentUsername()).math.points).toBe(0);
    // 랭킹 서버에 올라갔다 (서버 함수 edu_submit_solve)
    await vi.waitFor(() => expect(post).toHaveBeenCalled());
    const [url, init] = post.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/edu_submit_solve");
    expect(JSON.parse(init.body as string)).toMatchObject({
      p_subject: "kor",
      p_points: kor.points,
      p_wave: 3,
      p_streak: 1,
      p_perfect: true,
    });
  });

  it("랭킹에 동의하지 않았으면 점수는 이 기기에만 쌓이고 서버로 보내지 않는다", async () => {
    setActiveProfile(currentUsername(), profile({ subject: "math", grade: 2, semester: 2, rankingConsent: false }));
    const post = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    rankingHooks.url = () => "https://example.supabase.co";
    rankingHooks.key = () => "k".repeat(40);
    rankingHooks.fetch = post;
    vi.spyOn(mathGateHooks, "show").mockResolvedValue({
      perfect: true,
      misses: 0,
      hints: 0,
      level: 1,
      kind: "gugu",
      timeouts: 0,
    });
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    expect(loadStats(currentUsername()).math.solved).toBe(1);
    expect(post).not.toHaveBeenCalled();
  });

  it("영어·수학도 그 과목 문제가 나온다", async () => {
    setActiveProfile(currentUsername(), profile({ subject: "eng", grade: 4, semester: 2, difficulty: "easy" }));
    let captured: Parameters<typeof mathGateHooks.show>[0] | undefined;
    vi.spyOn(mathGateHooks, "show").mockImplementation(opts => {
      captured = opts;
      return Promise.resolve({ perfect: false, misses: 1, hints: 0, level: 1, kind: "meaning", timeouts: 0 });
    });
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    for (let i = 0; i < 20; i++) {
      expect(captured!.question!(undefined).subject).toBe("eng");
    }
    // 한 번에 못 맞히면 연속 정답이 끊기고 점수는 적다
    const eng = loadStats(currentUsername()).eng;
    expect(eng).toMatchObject({ solved: 1, perfect: 0, bestStreak: 0 });
    expect(eng.points).toBe(10);
  });

  it("학습 설정이 없으면 먼저 설정 화면을 열고, 설정한 값으로 이어간다", async () => {
    const setup = vi
      .spyOn(mathGateHooks, "setup")
      .mockResolvedValue(profile({ subject: "math", grade: 2, semester: 1 }));
    const show = vi
      .spyOn(mathGateHooks, "show")
      .mockResolvedValue({ perfect: true, misses: 0, hints: 0, level: 1, kind: "gugu", timeouts: 0 });
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledTimes(1);
    expect(loadStats(currentUsername()).math.solved).toBe(1);
    // 다음부터는 저장된 설정을 쓴다
    expect(JSON.parse(localStorage.getItem(`pkr_edu_profile:${currentUsername()}`)!).grade).toBe(2);
  });

  it("난이도가 높으면 보상 등급 행운이 커진다", async () => {
    setActiveProfile(currentUsername(), profile({ difficulty: "extreme" }));
    vi.spyOn(mathGateHooks, "show").mockResolvedValue({
      perfect: true,
      misses: 0,
      hints: 0,
      level: 4,
      kind: "gugu",
      timeouts: 0,
    });
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const unshift = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    game.move.use(MoveId.SPLASH);
    await game.doKillOpponents();
    await game.phaseInterceptor.to("MathGatePhase", false);
    await game.phaseInterceptor.to("SelectModifierPhase", false);
    const luck = unshift.mock.calls.find(c => c[0] === "MathRewardPhase")![2] as number;
    expect(luck).toBeCloseTo(0.15 + DIFFICULTY_RULES.extreme.rewardLuck, 5);
  });
});
