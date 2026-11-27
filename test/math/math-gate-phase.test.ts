import { initGlobalScene } from "#app/global-scene";
import { MathGatePhase } from "#phases/math-gate-phase";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ money: 0 }));
describe("MathGatePhase", () => {
  beforeEach(() => {
    vi.stubEnv("MODE", "development");
    vi.useFakeTimers();
    mocks.money = 0;
    initGlobalScene({
      currentBattle: { waveIndex: 3 },
      addMoney: (n: number) => {
        mocks.money += n;
      },
    } as any);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    document.getElementById("math-gate-overlay")?.remove();
  });

  function type(answer: number) {
    for (const ch of String(answer)) {
      Array.from(document.querySelectorAll<HTMLButtonElement>(".mg-pad button"))
        .find(b => b.textContent === ch)!
        .click();
    }
    document.querySelector<HTMLButtonElement>(".mg-ok")!.click();
  }

  it("오답이면 닫히지 않고, 정답이면 다음 층으로 진행한다", () => {
    const phase = new MathGatePhase();
    const end = vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    expect(document.getElementById("math-gate-overlay")).not.toBeNull();

    type(99999);
    vi.advanceTimersByTime(2000);
    expect(end).not.toHaveBeenCalled();

    const answer = (phase as any).problem.answer as number;
    type(answer);
    vi.advanceTimersByTime(2000);
    expect(end).toHaveBeenCalledTimes(1);
    expect(document.getElementById("math-gate-overlay")).toBeNull();
    expect(mocks.money).toBe(0); // 한 번 틀렸으므로 보너스 없음
  });

  it("한 번에 정답이면 보너스 머니를 준다", () => {
    const phase = new MathGatePhase();
    vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    type((phase as any).problem.answer);
    expect(mocks.money).toBeGreaterThan(0);
  });
});
