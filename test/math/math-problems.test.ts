import { generateProblem, getDifficulty, type MathProblemKind } from "#app/math/math-problems";
import { describe, expect, it } from "vitest";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("수학 포켓로그 문제 생성기", () => {
  it("난이도는 웨이브에 따라 올라간다", () => {
    expect(getDifficulty(1)).toBe(1);
    expect(getDifficulty(15)).toBe(2);
    expect(getDifficulty(40)).toBe(3);
    expect(getDifficulty(120)).toBe(4);
  });

  it("모든 문제의 정답은 양의 정수이고 풀이가 있다", () => {
    const rng = seeded(1234);
    const kinds = new Set<MathProblemKind>();
    for (let wave = 1; wave <= 200; wave++) {
      for (let i = 0; i < 20; i++) {
        const p = generateProblem(wave, rng);
        kinds.add(p.kind);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThan(0);
        expect(p.question.length).toBeGreaterThan(0);
        expect(p.hint.length).toBeGreaterThan(0);
        expect(p.explanation).toContain(String(p.answer));
      }
    }
    expect(kinds.size).toBe(4);
  });

  it("비례식은 외항의 곱과 내항의 곱이 같다", () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const p = generateProblem(5, rng, "share2");
      expect(p.kind).toBe("proportion");
      const m = p.question.match(/(\S+) : (\S+) = (\S+) : (\S+)/)!;
      const t = m.slice(1, 5).map(x => (x === "□" ? p.answer : Number(x)));
      expect(t[0] * t[3]).toBe(t[1] * t[2]);
    }
  });
});
