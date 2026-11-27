import { MAX_MISSES, OVERLAY_ID, showMathGate } from "#app/math/math-gate-ui";
import { checkAnswer, generateProblem } from "#app/math/math-problems";
import { seeded } from "#test/math/seeded-rng";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const press = (key: string) =>
  document.querySelector<HTMLButtonElement>(`#${OVERLAY_ID} button[data-key="${key}"]`)!.click();
const type = (n: number | string) => {
  for (const ch of String(n)) {
    press(ch);
  }
  press("ok");
};
const display = () => document.querySelector(`#${OVERLAY_ID} .mg-display`)!.textContent;
const question = () => document.querySelector(`#${OVERLAY_ID} .mg-q`)!.textContent;

describe("수학 관문 화면", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(OVERLAY_ID)?.remove();
  });

  /** 같은 시드로 화면과 같은 문제를 미리 만들어 정답을 알아낸다 */
  function open(seed: number, extra = {}) {
    const sounds: string[] = [];
    const answerRng = seeded(seed);
    const promise = showMathGate({
      wave: 3,
      lang: "ko",
      names: ["피카츄", "이브이"],
      streak: 2,
      bonus: 100,
      rng: seeded(seed),
      playSound: k => sounds.push(k),
      ...extra,
    });
    const first = generateProblem(3, answerRng);
    return { promise, first, sounds, answerRng };
  }

  it("제목·문제·연속 정답을 보여준다", () => {
    const { first } = open(1);
    expect(document.querySelector(".mg-title")!.textContent).toBe("4층으로 가는 문");
    expect(question()!.length).toBeGreaterThan(5);
    expect(document.querySelector(".mg-tags")!.textContent).toContain("연속 정답 2");
    expect(checkAnswer(first, String(first.answer))).toBe(true);
  });

  it("한 번에 맞히면 perfect 로 끝나고 화면이 닫힌다", async () => {
    const { promise, first, sounds } = open(2);
    type(first.answer);
    expect(document.querySelector(".mg-msg")!.textContent).toContain("4층이 열렸어요");
    expect(document.querySelector(".mg-msg")!.textContent).toContain("보너스 ₽100");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ perfect: true, misses: 0, hints: 0 });
    expect(document.getElementById(OVERLAY_ID)).toBeNull();
    expect(sounds).toContain("correct");
  });

  it("오답이면 닫히지 않고, 힌트를 쓰면 perfect 가 아니다", async () => {
    const { promise, first, sounds } = open(3);
    type(first.answer + 1);
    expect(document.querySelector(".mg-msg")!.textContent).toContain(`1/${MAX_MISSES}`);
    expect(sounds).toContain("error");
    press("hint");
    expect(document.querySelector(".mg-msg")!.className).toContain("hint");
    type(first.answer);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ perfect: false, misses: 1, hints: 1 });
  });

  it(`${MAX_MISSES}번 틀리면 풀이를 보여주고 새 문제를 낸다`, async () => {
    const { promise, first, answerRng } = open(4);
    const before = question();
    for (let i = 0; i < MAX_MISSES; i++) {
      type(first.answer + 1);
    }
    expect(document.querySelector(".mg-msg")!.textContent).toContain(`= ${first.answer}`);
    const second = generateProblem(3, answerRng, first.kind);
    expect(question()).not.toBe(before);
    type(second.answer);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toMatchObject({ perfect: false, misses: MAX_MISSES });
  });

  it("키보드로 입력·지우기·제출할 수 있고, 게임에는 키가 전달되지 않는다", async () => {
    const { promise, first } = open(5);
    const gameListener = vi.fn();
    window.addEventListener("keydown", gameListener);
    const key = (k: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true }));
    key("9");
    key("Backspace");
    expect(display()).toBe("?");
    for (const ch of String(first.answer)) {
      key(ch);
    }
    expect(display()).toContain(String(first.answer));
    key("Enter");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toMatchObject({ perfect: true });
    expect(gameListener).not.toHaveBeenCalled();
    window.removeEventListener("keydown", gameListener);
  });

  it("영어로도 표시된다", () => {
    open(6, { lang: "en" });
    expect(document.querySelector(".mg-title")!.textContent).toBe("Gate to Floor 4");
  });
});
