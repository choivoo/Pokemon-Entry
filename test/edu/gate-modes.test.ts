import { DIFFICULTY_RULES } from "#app/edu/difficulty";
import { choiceQ, numQ, type Question } from "#app/edu/question";
import { OVERLAY_ID, showMathGate } from "#app/math/math-gate-ui";
import { seeded } from "#test/math/seeded-rng";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const base = { subject: "kor", kind: "antonym", category: "반대말", level: 2 } as const;
const $ = (sel: string) => document.querySelector(`#${OVERLAY_ID} ${sel}`) as HTMLElement;
const choiceBtns = () => Array.from(document.querySelectorAll<HTMLButtonElement>(`#${OVERLAY_ID} .mg-choice`));
const press = (key: string) =>
  document.querySelector<HTMLButtonElement>(`#${OVERLAY_ID} button[data-key="${key}"]`)!.click();
const key = (k: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true }));

/** 항상 같은 순서의 문제를 내는 문제 공급기 */
function supplier(list: Question[]) {
  let i = 0;
  return vi.fn((_exclude?: string) => list[Math.min(i++, list.length - 1)]);
}

const choice1 = () =>
  choiceQ(seeded(1), base, "'크다'의 반대말은?", "작다", ["높다", "길다", "많다"], "크기가 반대", "크다 ↔ 작다");
const num1 = (n = 12): Question =>
  numQ({ ...base, subject: "math", kind: "gugu", category: "곱셈구구" }, "3 × 4 = □", n, "", "3단", `3 × 4 = ${n}`);

describe("관문 화면: 선택형 · 난이도 규칙", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(OVERLAY_ID)?.remove();
  });

  const open = (q: () => Question | Question[], extra: Partial<Parameters<typeof showMathGate>[0]> = {}) => {
    const list = q();
    const question = supplier(Array.isArray(list) ? list : [list]);
    const promise = showMathGate({
      wave: 3,
      lang: "ko",
      names: [],
      streak: 0,
      bonus: 1,
      question,
      rng: seeded(1),
      ...extra,
    });
    return { promise, question };
  };

  it("선택형 문제는 번호 버튼 4개를 보여 주고, 숫자 키패드는 숨긴다", () => {
    open(choice1);
    expect(choiceBtns()).toHaveLength(4);
    expect($(".mg-pad").classList.contains("hidden")).toBe(true);
    expect($(".mg-display").classList.contains("hidden")).toBe(true);
    expect($(".mg-tags").textContent).toContain("반대말");
    expect($(".mg-keys").textContent).toContain("1~4");
  });

  it("선택지를 누르면 바로 채점한다: 오답은 막히고, 정답이면 문이 열린다", async () => {
    const q = choice1();
    const { promise } = open(() => q);
    const wrongIdx = q.choices!.findIndex((_, i) => i !== q.answer);
    choiceBtns()[wrongIdx].click();
    expect(choiceBtns()[wrongIdx].disabled).toBe(true);
    expect($(".mg-msg").textContent).toContain("틀렸어요");
    choiceBtns()[q.answer].click();
    expect($(".mg-msg").textContent).toContain("열렸어요");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toMatchObject({ perfect: false, misses: 1, kind: "antonym", level: 2 });
  });

  it("키보드 숫자(1~4)로도 고를 수 있다", async () => {
    const q = choice1();
    const { promise } = open(() => q);
    key(String(q.answer + 1));
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toMatchObject({ perfect: true });
  });

  it("점수를 계산해서 정답 메시지에 보여 준다", () => {
    const q = choice1();
    open(() => q, { scoreFor: ({ level, perfect }) => level * 10 + (perfect ? 5 : 0) });
    choiceBtns()[q.answer].click();
    expect($(".mg-msg").textContent).toContain("+25점");
  });

  it("이지: 5번까지 틀려도 같은 문제, 6번째가 아니라 5번째에 풀이와 새 문제", () => {
    const { question } = open(() => [num1(), num1(7)], { rule: DIFFICULTY_RULES.easy });
    for (let i = 0; i < 4; i++) {
      press("9");
      press("ok");
    }
    expect(question).toHaveBeenCalledTimes(1);
    expect($(".mg-msg").textContent).toContain("4/5");
    press("9");
    press("ok");
    expect(question).toHaveBeenCalledTimes(2);
    expect($(".mg-msg").textContent).toContain("풀이");
  });

  it("익스트림: 1번만 틀려도 새 문제, 힌트 버튼이 없다", () => {
    const { question } = open(() => [num1(), num1(7)], { rule: DIFFICULTY_RULES.extreme });
    expect($(".mg-hint").classList.contains("hidden")).toBe(true);
    key("h");
    expect($(".mg-msg").textContent).not.toContain("💡");
    press("9");
    press("ok");
    expect(question).toHaveBeenCalledTimes(2);
  });

  it("하드: 힌트는 문제마다 1번", () => {
    open(() => num1(), { rule: DIFFICULTY_RULES.hard });
    expect($(".mg-hint").textContent).toContain("(1)");
    key("h");
    expect($(".mg-msg").textContent).toContain("💡");
    expect(($(".mg-hint") as HTMLButtonElement).disabled).toBe(true);
    expect($(".mg-hint").textContent).toContain("(0)");
  });

  it("하드: 60초 제한 시간이 흐르고, 시간이 다 되면 오답 1번으로 센다", async () => {
    const { promise, question } = open(() => [num1(), num1(7)], { rule: DIFFICULTY_RULES.hard });
    expect($(".mg-timer").classList.contains("hidden")).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect($(".mg-timer span").textContent).toBe("30");
    await vi.advanceTimersByTimeAsync(31_000);
    expect($(".mg-msg").textContent).toContain("시간 초과");
    expect($(".mg-timer span").textContent).toBe("59"); // 시간 초과 직후 60초로 다시 시작해서 1초가 흐른 상태
    // 2번째 시간 초과 → 하드는 2번까지라서 새 문제
    await vi.advanceTimersByTimeAsync(61_000);
    expect(question).toHaveBeenCalledTimes(2);
    press("7"); // 새 문제의 정답
    press("ok");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toMatchObject({ timeouts: 2, perfect: false });
  });

  it("이지·노멀은 제한 시간이 없다", async () => {
    open(() => num1(), { rule: DIFFICULTY_RULES.normal });
    expect($(".mg-timer").classList.contains("hidden")).toBe(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect($(".mg-msg").textContent).not.toContain("시간 초과");
  });

  it("난이도 이름이 태그로 보인다", () => {
    open(() => num1(), { rule: DIFFICULTY_RULES.extreme });
    expect($(".mg-tags").textContent).toContain("익스트림");
  });

  it("직전 문제 유형을 문제 공급기에 알려 준다", () => {
    const { question } = open(() => [num1(), num1(7)], { rule: DIFFICULTY_RULES.extreme });
    expect(question).toHaveBeenLastCalledWith(undefined);
    press("9");
    press("ok");
    expect(question).toHaveBeenLastCalledWith("gugu");
  });
});
