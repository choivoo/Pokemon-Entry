import { REWARD_OVERLAY_ID, type RewardCard, showRewardScreen } from "#app/math/math-reward-ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cards = (n: number): RewardCard[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `보상${i}`,
    description: `설명${i}`,
    icon: "./images/items/potion.png",
    rarity: i % 5,
  }));
const key = (k: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true }));
const $ = (sel: string) => document.querySelector(`#${REWARD_OVERLAY_ID} ${sel}`) as HTMLElement;

describe("보상 화면", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(REWARD_OVERLAY_ID)?.remove();
  });

  it("고르기: 방향키로 고르고 Enter 두 번(고르기→받기)으로 그 보상을 받는다", async () => {
    const p = showRewardScreen({ mode: "choice", cards: cards(3), lang: "ko" });
    expect($(".mr-title").textContent).toBe("보상 고르기");
    expect(document.querySelectorAll(`#${REWARD_OVERLAY_ID} .mr-item`)).toHaveLength(3);
    key("ArrowRight");
    key("ArrowRight");
    key("Enter");
    expect($(".mr-btn").textContent).toBe("받기");
    key("Enter");
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe(2);
    expect(document.getElementById(REWARD_OVERLAY_ID)).toBeNull();
  });

  it("보물 상자: 처음엔 내용이 안 보이고, 열면 모든 상자 내용이 공개된다", async () => {
    const p = showRewardScreen({ mode: "box", cards: cards(3), lang: "ko" });
    expect(document.body.textContent).not.toContain("보상1");
    key("2");
    $(".mr-btn").click();
    expect(document.body.textContent).toContain("보상0");
    expect(document.body.textContent).toContain("보상2");
    $(".mr-btn").click();
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe(1);
  });

  it("룰렛: 8칸이 있고, 돌리면 난수로 정한 칸에서 멈춘다", async () => {
    const sounds: string[] = [];
    const p = showRewardScreen({
      mode: "roulette",
      cards: cards(8),
      lang: "ko",
      rng: () => 0.7, // 8칸 중 5번 칸
      spinMs: 1000,
      playSound: s => sounds.push(s),
    });
    expect(document.querySelectorAll(`#${REWARD_OVERLAY_ID} .mr-slot`)).toHaveLength(8);
    key("Enter");
    expect(($(".mr-btn") as HTMLButtonElement).disabled).toBe(true);
    key("Enter"); // 도는 중에는 무시
    await vi.advanceTimersByTimeAsync(1200);
    expect($(".mr-result").textContent).toContain("보상5");
    expect(sounds).toEqual(expect.arrayContaining(["spin", "tick", "win"]));
    key("Enter");
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe(5);
  });

  it("잭팟 룰렛은 제목이 다르고 영어도 지원한다", () => {
    showRewardScreen({ mode: "jackpot", cards: cards(8), lang: "en" });
    expect($(".mr-title").textContent).toBe("Jackpot Roulette");
  });
});
