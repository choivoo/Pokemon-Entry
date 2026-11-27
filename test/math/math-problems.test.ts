import { checkAnswer, generateProblem, getDifficulty, type MathProblemKind } from "#app/math/math-problems";
import { formatProblem, josa, josaRo, toMathLang } from "#app/math/math-text";
import { seeded } from "#test/math/seeded-rng";
import { describe, expect, it } from "vitest";

describe("수학 포켓로그 - 문제 생성기", () => {
  it("난이도는 층이 오를수록 올라간다", () => {
    expect([1, 15, 40, 120].map(getDifficulty)).toEqual([1, 2, 3, 4]);
  });

  it("모든 유형이 나오고, 정답은 항상 문제 데이터와 맞는 양의 정수다", () => {
    const rng = seeded(1234);
    const kinds = new Set<MathProblemKind>();
    for (let wave = 1; wave <= 200; wave++) {
      for (let i = 0; i < 20; i++) {
        const p = generateProblem(wave, rng);
        kinds.add(p.kind);
        expect(Number.isInteger(p.answer) && p.answer > 0).toBe(true);
        switch (p.kind) {
          case "proportion": {
            const [a, b, c, d] = p.terms;
            expect(a * d).toBe(b * c);
            expect(p.terms[p.blank]).toBe(p.answer);
            break;
          }
          case "share2":
          case "share3": {
            const sum = p.ratio.reduce((x, y) => x + y, 0);
            expect(p.total % sum).toBe(0);
            expect(p.answer).toBe((p.total / sum) * p.ratio[p.ask]);
            expect(new Set(p.ratio).size).toBe(p.ratio.length);
            break;
          }
          case "difference": {
            const [big, small] = p.ratio;
            expect(big).toBeGreaterThan(small);
            const unit = p.diff / (big - small);
            expect(Number.isInteger(unit)).toBe(true);
            expect(p.answer).toBe(p.ratio[p.ask] * unit);
            break;
          }
        }
      }
    }
    expect(kinds.size).toBe(4);
  });

  it("직전 유형을 제외할 수 있다", () => {
    const rng = seeded(9);
    for (let i = 0; i < 100; i++) {
      expect(generateProblem(5, rng, "proportion").kind).toBe("share2");
    }
  });

  it("정답 판정은 숫자만 받는다", () => {
    const p = generateProblem(1, seeded(3));
    expect(checkAnswer(p, String(p.answer))).toBe(true);
    expect(checkAnswer(p, ` ${p.answer} `)).toBe(true);
    expect(checkAnswer(p, String(p.answer + 1))).toBe(false);
    expect(checkAnswer(p, "")).toBe(false);
    expect(checkAnswer(p, "1e3")).toBe(false);
  });
});

describe("수학 포켓로그 - 문장", () => {
  it("한국어 조사를 받침에 맞게 붙인다", () => {
    expect(josa("피카츄", "이", "가")).toBe("피카츄가");
    expect(josa("리자몽", "이", "가")).toBe("리자몽이");
    expect(josa("이브이", "과", "와")).toBe("이브이와");
    expect(josaRo("3 : 5")).toBe("3 : 5로");
    expect(josaRo("2 : 3")).toBe("2 : 3으로");
    expect(josaRo("4 : 7")).toBe("4 : 7로");
  });

  it("언어 코드를 고른다", () => {
    expect(toMathLang("ko")).toBe("ko");
    expect(toMathLang("ko-KR")).toBe("ko");
    expect(toMathLang("ja")).toBe("en");
    expect(toMathLang(undefined)).toBe("en");
  });

  it("모든 문제는 두 언어로 문장·힌트·풀이를 만들고, 풀이에 정답이 나온다", () => {
    const rng = seeded(42);
    for (let wave = 1; wave <= 150; wave += 3) {
      for (let i = 0; i < 10; i++) {
        const p = generateProblem(wave, rng);
        for (const lang of ["ko", "en"] as const) {
          const t = formatProblem(p, lang, ["피카츄"]);
          expect(t.question.length).toBeGreaterThan(5);
          expect(t.hint.length).toBeGreaterThan(5);
          expect(t.explanation).toContain(`= ${p.answer}`);
          expect(t.question).not.toContain("undefined");
          expect(t.question).not.toContain(String(p.answer) === "□" ? "x" : "NaN");
        }
      }
    }
  });

  it("파티 포켓몬 이름을 문제에 쓰고, 부족하면 기본 이름으로 채운다", () => {
    const rng = seeded(5);
    let p = generateProblem(50, rng);
    while (p.kind !== "share3") {
      p = generateProblem(50, rng);
    }
    const t = formatProblem(p, "ko", ["꼬부기"]);
    expect(t.question).toContain("꼬부기");
    expect(new Set(t.question.match(/(꼬부기|피카츄|이브이|리자몽)/g)).size).toBe(3);
  });
});
